
var Core = require('../venacava.js').Core
, assert = require('assert')
, redisClient = require('../src/redisClient')
;

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};


describe('base-core', function () {

    var redis;
    before(function () {
	redis = Core.redis;
	assert(redis);
    });

    describe('#exists', function () {

	it('should exist', function () {
	    assert(Core.exists);
	});
	
	it('should asynchrounously return false for non-existance channels', function (done) {
	    Core.exists(randomId(), function (err, exists) {
		assert.ifError(err);
		assert(!exists);
		done();
	    });
	});

	it('should asynchrounously return true for existant channels', function (done) {
	    var channel = randomId();
	    redis.set(channel, 1);

	    Core.exists(channel, function (err, exists) {
		assert.ifError(err);
		assert(exists);
		done();
	    });
	});
    });

    describe('#erase', function () {
	it('should exist', function () {
	    assert(Core.erase);
	});

	it('should asynchronously erase an existant channel', function (done) {
	    var channel = randomId();
	    redis.set(channel, 1);

	    Core.erase(channel);
	    Core.exists(channel, function (err, exists) {
		assert.ifError(err);
		assert(!exists);
		done();
	    });
	});
    });

    describe(':instance', function () {
	var newCore = function (channel, options) {
	    if (!channel) {
		channel = randomId();
	    }
	    return new Core(channel, options);
	}
	;

	it('should be constructable', function () {
	    newCore();
	});

	it('should have a channel attribute', function () {
	    assert(newCore().channel);
	});

	describe('#redis', function () {

	    it('should have a default redis attribute', function () {
		assert(newCore().redis);
	    });


	    it('should have a take a different redis as an option.', function () {
		var fauxRedis = { fake: 'redis'}
		, instance = newCore('test', {
		    redis: fauxRedis
		})
		;
		
		assert.equal(fauxRedis, instance.redis);
	    });
	});


	describe('#exists', function () {
	    it('should exist', function () {
		assert(newCore().exists);
	    });

	    it('should asynchronously return false for non-existant channels', function (done) {
		newCore().exists(function (err, exists) {
		    assert.ifError(err);
		    assert(!exists);
		    done();
		});
	    });

	    it('should synchronously return true for existant channels', function (done) {
		var instance = newCore();
		redis.set(instance.channel, 1);

		instance.exists(function (err, exists) {
		    assert.ifError(err);
		    assert(exists);
		    done();
		});
	    });
	});

	describe('#erase', function () {

	    it('should exist', function () {
		assert(newCore().erase);
	    });

	    it('should erase existing channels', function (done) {
		var instance = newCore();
		redis.set(instance.channel, 1);
		
		instance.erase();
		instance.exists(function (err, exists) {
		    assert.ifError(err);
		    assert(!exists);
		    done();
		});
	    });

	    it('should send "erased" updates', function (done) {
		var subRedis = redisClient.create()
		, instance = newCore()
		;
		redis.set(instance.channel, '1');
		subRedis.on('message', function (channel, msg) {
		    var obj = JSON.parse(msg);
		    assert.equal(channel, instance.channel);
		    assert(obj.hasOwnProperty('subject'))
		    done();
		});
		subRedis.on('subscribe', function (channel, count) {
		    assert.equal(channel, instance.channel, 'subscribed to unknown channel.');
		    instance.erase();
		});

		subRedis.subscribe(instance.channel);
	    });
	});

	describe('#emit', function () {

	    it('should trigger messages on redis without body', function () {
		var subRedis = redisClient.create()
		, instance = newCore()
		, subject = randomId()
		;
		redis.set(instance.channel, '1');
		subRedis.on('message', function (channel, msg) {
		    var obj = JSON.parse(msg);
		    assert.equal(channel, instance.channel);
		    assert(obj.hasOwnProperty('subject'))
		    assert.equal(obj.subject, subject);
		    assert(!obj.hasOwnProperty('body'));
		    done();
		});
		subRedis.on('subscribe', function (channel, count) {
		    assert.equal(channel, instance.channel, 'subscribed to unknown channel.');
		    instance.emit(subject);
		});

		subRedis.subscribe(instance.channel);
	    });

	    it('should trigger messages on redis without body', function () {
		var subRedis = redisClient.create()
		, instance = newCore()
		, subject = randomId()
		, body = {x: 1}
		;
		redis.set(instance.channel, '1');
		subRedis.on('message', function (channel, msg) {
		    var obj = JSON.parse(msg);
		    assert.equal(channel, instance.channel);
		    assert(obj.hasOwnProperty('subject'))
		    assert.equal(obj.subject, subject);
		    assert(obj.hasOwnProperty('body'));
		    assert.deepEqual(body, obj.body);
		    done();
		});
		subRedis.on('subscribe', function (channel, count) {
		    assert.equal(channel, instance.channel, 'subscribed to unknown channel.');
		    instance.emit(subject, body);
		});

		subRedis.subscribe(instance.channel);
	    });

	});

    });

    
});