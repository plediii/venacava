
var venacava = require('./venacava.js')
, Core = venacava.Core
, CallbackHandler = venacava.CallbackHandler
, Model = venacava.Model
, Proxy = venacava.Proxy
, redis = require('redis')
, assert = require('assert')
, EventEmitter = require('events').EventEmitter
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
    , newModel = function (proto) {
	return new Model(redis, proto);
    }
    , newProxy = function (model) {
	return new Proxy(redis, cbHandler, model);
    }
    ;


    before(function(done) {
	redis = redisClient();
	cbHandler = new CallbackHandler(randomId(), redisClient(), redis);
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

	it('should execute target methods in the order of call', function (done) {
	    var addNote = function (note, delay) {

		var add = function (core, cb) {
		    return function () {
			core.set('notes', (core.get('notes') || []).concat([note])); 
			return cb();
		    };
		};

		return function (cb) {
		    if (delay) {
			setTimeout(add(this.core, cb), delay);
		    }
		    else {
			add(this.core, cb)();
		    }
		}
	    }
	    , model = newModel({
		methodA: addNote('a', 1000)
		, methodB: addNote('b')
	    })
	    , proxy = newProxy(model)
	    , instance = proxy.create({})
	    ;
	    instance.methodB();
	    instance.methodA();
	    instance.methodB(function () {
		var dup = model.get(instance.channel);
		return dup.core.fetch(function (err) {
		    if (err) {
			assert.ifError(err);
		    }
		    assert.deepEqual(dup.core.get('notes'), ['b', 'a', 'b']);
		    return done();
		});
	    });
	}); 

    });
});
