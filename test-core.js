
var Core = require('./venacava.js').Core
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


describe('core', function () {

    var redis
    , newCore = function (channel, attrs) {
	if (typeof channel === 'object') {
	    attrs = channel;
	    channel = randomId();
	}
	else if (!channel) {
	    channel = randomId();
	}
	return new Core(channel, redis, attrs);
    }
    ;


    before(function(done) {
	redis = redisClient();
	return done();
    });

    it('should be constructable', function () {
	newCore({x: 1});
    });

    it('should have a channel attribute', function () {
	assert(newCore().channel, 'core did not have a channel property');
    });

    describe('#fetch', function () {

	it('should exist', function () {
	    var core = newCore();
	    assert(core.fetch, 'core did not have a fetch property');
	    assert(typeof core.fetch === 'function', 'core.fetch was not a function');
	});

	it('should restore previously set values', function (done) {
	    var core = newCore()
	    ;
	    core.set('x', Math.random(), function (err) {
		assert.ifError(err);
		
		var dup = newCore(core.channel, {x: Math.random()});
		dup.fetch(function (err) {
		    assert.ifError(err);
		    assert.equal(core.get('x'), dup.get('x'), 'failed to fetch');
		    done();
		});
	    });
	});
    });

    describe('#get', function () {

	it('should exist', function () {
	    var core = newCore();
	    assert(core.get);
	    assert.equal(typeof core.get, 'function', '"get" was not a function');
	});

	it('should synchronously return a single cached value for a single argument', function () {
	    var x = Math.random()
	    , core = newCore({x: x})
	    ;
	    assert.equal(core.get('x'), x, 'did not get the initial cached value');
	});

    });

    describe('#toJSON', function () {
	it('should synchronously return a cloned copy of the cached attrs', function () {
	    var attrs = {
		x: Math.random()
	    }
	    , core = newCore(attrs)
	    , cloned = core.toJSON()
	    ;
	    assert.deepEqual(cloned, attrs, 'did not get the initial cached attrs');
	    var y = cloned.x = Math.random();
	    assert.notDeepEqual(cloned, core.toJSON(), 'failed to successfully modify cloned attributes');
	});
    });

    describe('#set', function () {
	it('should synchronously modify a single cached value for a single argument', function () {
	    var attrs = {
		x: Math.random()
	    }
	    , core = newCore(attrs)
	    , y = Math.random()
	    ;
	    core.set('x', y);
	    assert.equal(core.get('x'), y);
	});

	it('should synchronously modify a set of cached values for an object argument', function () {
	    var attrs = {
		x: Math.random()
		, y: Math.random()
		, z: Math.random()
	    }
	    , core = newCore(attrs)
	    , newAttrs = {
		x: Math.random()
		, y: Math.random()
	    }
	    ;
	    core.set(newAttrs)
	    assert.equal(newAttrs.x, core.get('x'), 'failed to set x through object argument');
	    assert.equal(newAttrs.y, core.get('y'), 'failed to set y through object argument');
	    assert.equal(attrs.z, core.get('z'), 'failed to preserve z after object argument');
	});

	describe(':async', function () {
	    it('should be provided', function (done) {
		newCore({x: 1}).set('x', 2, done);
	    });

	    it('should guarantee that the value is stored in the fetch source', function (done) {
		var core = newCore()
		, x = Math.random()
		;
		core.set('x', x, function (err) {
		    assert.ifError(err);
		    var dup = newCore(core.channel);
		    dup.fetch(function (err) {
			assert.ifError(err);
			assert.equal(dup.get('x'), x);
			return done();
		    });
		});
	    });
	});
    });

    describe('#has', function () {
	it('should exist', function () {
	    var core = newCore();
	    assert(core.has, '"has" does not exist');
	    assert.equal(typeof core.has, 'function', '"has" is not a function');
	});

	it('should indicate the existence of an attribute', function () {
	    var core = newCore({x: 1});
	    assert(core.has('x'), 'core did not properly indicate existing attribute.');
	    assert(!core.has('y'), 'core did not properly indicate existing attribute.');
	});
    });

    describe('#unset', function () {
	it('should exist', function () {
	    var core = newCore();
	    assert(core.unset, '"unset" does not exist');
	    assert.equal(typeof core.unset, 'function', '"unset" is not a function');
	});

	it('should change the truthiness of associated has', function () {
	    var core = newCore({x: 1});
	    core.unset('x')
	    assert(!core.has('x'), 'unset did not change "has" value');
	});

	it('should change whether the attribute appears on toJSON ', function () {
	    var core = newCore({x: 1});
	    core.unset('x');
	    assert(!core.toJSON().hasOwnProperty('x'), 'unset did not change "has" value');
	});

	it('should unset multiple keys when given an object', function () {
	    var core = newCore({x: 1, y: 2, z: 3});
	    core.unset({x: true, y: true});
	    assert.deepEqual(core.toJSON(), {z: 3}, 'multiple properties were not unset');
	});

	describe(':async', function () {
	    it('should exist', function (done) {
		newCore({x: 1}).unset('x', done);
	    });

	    it('should guarantee that the property was unset in the fetch source', function (done) {
		var core = newCore()
		, x = Math.random()
		;
		core.set('x', 1, function (err) {
		    assert.ifError(err);
		    core.unset('x', function (err) {
			assert.ifError(err);
			var dup = newCore(core.channel);
			dup.fetch(function (err) {
			    assert.ifError(err);
			    assert(!dup.has('x'), 'property was not removed.');
			    return done();
			});
		    });
		});
	    });
	});
    });

    describe('#clear', function () {

	it('should exist', function () {
	    var core = newCore();
	    assert(core.clear, 'core did not have a "clear" property'); 
	    assert(typeof core.clear, 'function', '"clear" property was not a function')
	});

	it('should provide async', function (done) {
	    newCore({x: 1}).clear(done);
	});

	it('should clear all properties', function (done) {
	    var core = newCore();
	    core.set('x', 1, function (err) {
		assert.ifError(err);
		core.clear(function (err) {
		    assert.ifError(err);
		    var dup = newCore(core.channel);
		    dup.fetch(function (err) {
			assert.ifError(err);
			assert.deepEqual(dup.toJSON(), {}, 'core was not cleared in the backend: ' + JSON.stringify(dup.toJSON()));
			return done();
		    });

		});
	    });
	});

    });

    describe('redis subscription', function () {

	it('should send set updates', function (done) {
	    var subRedis = redisClient()
	    , core = newCore()
	    , attrs = {x: 1}
	    ;
	    subRedis.on('message', function (channel, msg) {
		assert.equal(channel, core.channel, 'received message on unknown channel.');
		var obj = JSON.parse(msg);
		assert.deepEqual(obj, attrs);
		done();
	    });

	    subRedis.subscribe(core.channel); 
	    subRedis.on('subscribe', function (channel, count) {
		assert.equal(channel, core.channel, 'suscribed to unknown channel.');
		core.set(attrs);
	    });
	});

	it('should send unset updates', function (done) {
	    var subRedis = redisClient()
	    , core = newCore()
	    , attrs = {x: 1}
	    ;
	    subRedis.on('message', function (channel, msg) {
		var obj = JSON.parse(msg);
		assert.equal(channel, core.channel, 'received message on unknown channel.');
		assert(obj.hasOwnProperty('x'), 'unset did not send a message for the unset property.');
		assert.equal(obj.x, void 0, 'unset did not send a message with undefined for the unset property.');
		done();
	    });

	    subRedis.subscribe(core.channel);
	    subRedis.on('subscribe', function (channel, count) {
		assert.equal(channel, core.channel, 'suscribed to unknown channel.');
		core.unset('x');
	    });
	});

    });
});
      