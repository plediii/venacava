
var venacava = require('../venacava.js')
, Core = venacava.Core
, CallbackHandler = venacava.CallbackHandler
, Model = venacava.Model
, Proxy = venacava.Proxy
, redis = require('redis')
, assert = require('assert')
, EventEmitter = require('events').EventEmitter
, _ = require('underscore')
;

var redisClient = function () {
    return redis.createClient();
};

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};


describe('proxy', function () {

    var redis
    , cbHandler
    , monitor
    , newModel = function (proto, redisInstance) {
	redisInstance = redisInstance || redis;
	return new Model(redisInstance, proto);
    }
    , newProxy = function (model, redisInstance) {
	redisInstance = redisInstance || redis;
	return new Proxy(redisInstance, cbHandler, model);
    }
    ;


    before(function(done) {
	redis = redisClient();
	cbHandler = new CallbackHandler(randomId(), redisClient(), redis);

	monitor = redisClient();
	monitor.monitor(function (err, res) {});
	return done();
    });

    it('should be constructable', function () {
	assert(newProxy(newModel({})), 'unable to create a new proxy.');
    });

    describe('#create', function () {
	it('should exist', function () {
	    var proxy = newProxy(newModel({}));
	    assert(proxy.create, 'proxy does not have a create property.');
	    assert(proxy.create({x: 1}));
	});

	it('should create the desired model type', function (done) {
	    var model = newModel({})
	    , proxy = newProxy(model)
	    , instance = proxy.create({x: 1})
	    ;
	    assert(instance.channel, 'proxy instance does not have a channel property');
	    var dup = model.get(instance.channel);
	    dup.core.fetch(function (err) {
		assert.ifError(err);
		assert.deepEqual(dup.core.toJSON(), {x: 1});
		done();
	    });
	});

	it('should create an instance with a channel', function () {
	    assert(newProxy(newModel({})).create({}).channel
		   , 'created proxy did not have a channel');
	})

    });

    describe('#get', function () {
	it('should exist', function () {
	    var proxy = newProxy(newModel({}));
	    assert(proxy.get, 'proxy does not have a get property.');
	    assert(proxy.get(randomId()), 'did not return an object');
	});

	it('should return an instance with the target channel', function () {
	    assert.equal(newProxy(newModel({})).get('somechannel').channel
			 , 'somechannel'
			 , 'bad channel name');
	});
    });

    describe('instance#methods', function () {

	it('should exist', function () {
	    var proxy = newProxy(newModel({
		method: function () {}
	    }))
	    , instance = proxy.get(randomId())
	    ;
	    assert(instance.method, 'proxy does not have the target model\'s method');
	});

	it('should be invokable', function (done) {
	    var proxy = newProxy(newModel({
		method: function (cb) { return cb(); }
	    }))
	    , instance = proxy.create({})
	    ;
	    instance.method(done);
	});

	it('should received the invocation arguments', function (done) {
	    var proxy = newProxy(newModel({
		method: function (x, cb) {
		    assert.equal(x, 1, 'argument was not transmitted to method');
		    return cb();
		}
	    }))
	    , instance = proxy.create({})
	    ;
	    instance.method(1, done);
	});

	it('should return arguments through callback', function (done) {
	    var proxy = newProxy(newModel({
		method: function (cb) {
		    return cb(null, 1);
		}
	    }))
	    , instance = proxy.create({})
	    ;
	    instance.method(function (err, val) {
		assert.equal(val, 1, 'result was not transmitted via the callback.');
		done();
	    });
	});

	it('should execute target methods with a fetched core', function (done) {
	    var proxy = newProxy(newModel({
		method: function (cb) {
		    assert(this.core.get('x'), 1, 'core was not synchronized');
		    return cb()
		}
	    }))
	    ;
	    
	    proxy.get(proxy.create({x:1}).channel)
		.method(done);
	});

	it('should not execute methods concurrently ', function (done) {
	    var model = newModel({
		method: function (cb) {
		    var _this = this
		    , count = _this.core.get('count') || 0
		    ;
		    return _.delay(function () {
			_this.core.set('count', 1 + count);
			return cb();
		    }, 250);
		}
	    })
	    , proxy = newProxy(model)
	    , instance = proxy.create({})
	    , finished = _.after(3, function () {
		var dup = model.get(instance.channel);
		return dup.core.fetch(function (err) {
		    if (err) {
			assert.ifError(err);
		    }
		    assert.equal(dup.core.get('count'), 3);
		    return done();
		});		
	    })
	    , method = _.bind(instance.method, instance);
	    ;
	    _.delay(method, 400, finished);
	    _.delay(method, 100, finished);
	    _.delay(method, 50, finished);
	}); 

	it('should release the lock after completing tasks', function (done) {
	    var model = newModel({
		method: function (cb) {
		    var _this = this
		    , count = _this.core.get('count') || 0
		    ;
		    return _.delay(function () {
			_this.core.set('count', 1 + count);
			return cb();
		    }, 50);
		}
	    })
	    , proxy = newProxy(model)
	    , instance = proxy.create({})
	    , finished = _.after(6, function () {
		var dup = model.get(instance.channel);
		return dup.core.fetch(function (err) {
		    if (err) {
			assert.ifError(err);
		    }
		    assert.equal(dup.core.get('count'), 6);
		    return done();
		});		
	    })
	    , method = _.bind(instance.method, instance);
	    ;
	    method(finished);
	    method(finished);
	    method(finished);
	    _.delay(function () {
		method(finished);
		method(finished);
		method(finished);
	    }, 400)
	}); 

	it('should not execute from different redis contexts concurrently ', function (done) {
	    var model = newModel({
		method: function (cb) {
		    var _this = this
		    , count = _this.core.get('count') || 0
		    ;
		    return _.delay(function () {
			_this.core.set('count', 1 + count);
			return cb();
		    }, 250);
		}
	    })
	    , proxy = newProxy(model)
	    , instance = proxy.create({})
	    , otherRedis = redisClient()
	    , otherModel = newModel(model.proto, otherRedis)
	    , otherProxy = newProxy(otherModel, otherRedis)
	    , otherInstance = otherProxy.get(instance.channel)
	    , finished = _.after(4, function () {
		var dup = model.get(instance.channel);
		return dup.core.fetch(function (err) {
		    if (err) {
			assert.ifError(err);
		    }
		    assert.equal(dup.core.get('count'), 4);
		    return done();
		});		
	    })
	    , method = _.bind(instance.method, instance)
	    , otherMethod = _.bind(otherInstance.method, otherInstance)
	    ;
	    _.delay(method, 200, finished);
	    _.delay(otherMethod, 100, finished);
	    _.delay(method, 50, finished);
	    _.delay(otherMethod, 50, finished);
	}); 

	it('should not attempt to lock unnecessarily ', function (done) {
	    var redis = redisClient()
	    , model = newModel({
		method: function (cb) {
		    return cb();
		}
	    }, redis)
	    , proxy = newProxy(model, redis)
	    , instance = proxy.create({})
	    , setnxCount = 0
	    , watchSetnx = function (time, args) {
		if (args[0].toUpperCase() === 'SETNX') {
		    setnxCount = setnxCount + 1;
		}
	    }
	    , finished = _.after(3, function () {
		assert.equal(setnxCount, 1, 'bad number of lock attempts: ' + setnxCount);
		return done();
	    })
	    , method = _.bind(instance.method, instance)
	    ;
	    monitor.on("monitor", watchSetnx);
	    instance.method(finished);
	    instance.method(finished);
	    instance.method(finished);
	}); 


    });
});
