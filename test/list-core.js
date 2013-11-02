
var ListCore = require('../venacava.js').ListCore
, assert = require('assert')
, redisClient = require('../src/redisClient')
;

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};


describe('list-core', function () {

    var newCore = function (channel) {
	if (!channel) {
	    channel = randomId();
	}
	return new Core(channel);
    }
    ;

    it('should be constructable', function () {
	newCore();
    });

    it('should have a channel attribute', function () {
	assert(newCore().channel, 'core did not have a channel property');
    });

    describe('#append', function () {

    });

    describe('redis subscription', function () {

	it('should send "append" updates', function (done) {
	    var subRedis = redisClient.create()
	    , core = newCore()
	    , attrs = {x: 1}
	    ;
	    subRedis.on('message', function (channel, msg) {
		var obj = JSON.parse(msg);
		assert.equal(channel, core.channel, 'received message on unknown channel.');
		assert(obj.hasOwnProperty('subject'), 'message did not have a subject.')
		assert.equal(obj.subject, 'set', 'message subject was not "set".');
		assert(obj.hasOwnProperty('body'), 'message did not have a body');
		assert.deepEqual(obj.body, attrs, 'wrong message body');
		done();
	    });

	    subRedis.subscribe(core.channel); 
	    subRedis.on('subscribe', function (channel, count) {
		assert.equal(channel, core.channel, 'subscribed to unknown channel.');
		core.set(attrs);
	    });
	});
    });


    describe('#exists', function () {
	it('should exist', function () {
	    assert(ListCore.exists, 'ListCore.exists does not exist.');
	});

	it('should return false for non-existent channels', function (done) {
	    var channel = newCore().channel;
	    HashCore.exists(channel, function (err, exists) {
		assert.ifError(err);
		assert(!exists, 'claimed existence.');
		done();
	    });
	});

	it('should return true for existing channels', function (done) {
	    var core = newCore();
	    core.set('x', 1);
	    HashCore.exists(core.channel, function (err, exists) {
		assert.ifError(err);
		assert(exists, 'claimed non-existence.');
		done();
	    });
	});

	it('should return true for existing channels; obj version', function (done) {
	    var core = newCore();
	    core.set({
		x: 1
	    });
	    HashCore.exists(core.channel, function (err, exists) {
		assert.ifError(err);
		assert(exists, 'claimed non-existence.');
		done();
	    });
	});

	describe(':instance', function () {

	    it('should exist', function () {
		assert(newCore().exists);
	    });
	    
	    it('should return false for non-extistent channels', function (done) {
		newCore().exists(function (err, exists) {
		    assert.ifError(err);
		    assert(!exists, 'claimed existence');
		    done();
		});
	    });

	    it('should return true  for existing channels', function (done) {
		var core = newCore();
		core.set('x', 1);
		newCore(core.channel).exists(function (err, exists) {
		    assert.ifError(err);
		    assert(exists, 'claimed non-existence');
		    done();
		});
	    });

	});
    });

    describe('#erase', function () {
	
	it('should exist', function () {
	    assert(HashCore.erase)
	});

	it('should erase existing cores', function (done) {
	    var core = newCore();
	    core.set('x', 1);
	    HashCore.erase(core.channel);
	    HashCore.exists(core.channel, function (err, exists) {
		assert.ifError(err);
		assert(!exists, 'core was not erased.');
		done();
	    })
	});

	describe(':instance', function () {
	    
	    it('should exist', function () {
		assert(newCore().erase);
	    });

	    it('should erase the core', function (done) {
		var core = newCore();
		core.set('x', 1);
		core.erase();
		HashCore.exists(core.channel, function (err, exists) {
		    assert.ifError(err);
		    assert(!exists, 'core was not erased.');
		    done();
		});
	    });

	});

    });

    describe('redis subscription', function () {


	it('should send "set" updates', function (done) {
	    var subRedis = redisClient.create()
	    , core = newCore()
	    , attrs = {x: 1}
	    ;
	    subRedis.on('message', function (channel, msg) {
		var obj = JSON.parse(msg);
		assert.equal(channel, core.channel, 'received message on unknown channel.');
		assert(obj.hasOwnProperty('subject'), 'message did not have a subject.')
		assert.equal(obj.subject, 'set', 'message subject was not "set".');
		assert(obj.hasOwnProperty('body'), 'message did not have a body');
		assert.deepEqual(obj.body, attrs, 'wrong message body');
		done();
	    });

	    subRedis.subscribe(core.channel); 
	    subRedis.on('subscribe', function (channel, count) {
		assert.equal(channel, core.channel, 'subscribed to unknown channel.');
		core.set(attrs);
	    });
	});

	it('should send "unset" updates', function (done) {
	    var subRedis = redisClient.create()
	    , core = newCore()
	    , attrs = {x: 1}
	    ;
	    subRedis.on('message', function (channel, msg) {
		var obj = JSON.parse(msg);
		assert.equal(channel, core.channel, 'received message on unknown channel.');
		assert(obj.hasOwnProperty('subject'), 'message did not have a subject.')
		assert.equal(obj.subject, 'unset', 'message subject was not "unset".');
		assert(obj.hasOwnProperty('body'), 'message did not have a body');
		assert(obj.body.hasOwnProperty('x'), 'message body did not have the expected atribute');
		done();
	    });

	    subRedis.subscribe(core.channel);
	    subRedis.on('subscribe', function (channel, count) {
		assert.equal(channel, core.channel, 'subscribed to unknown channel.');
		core.unset('x');
	    });
	});


	it('should send "erased" updates', function (done) {
	    var subRedis = redisClient.create()
	    , core = newCore()
	    ;
	    core.set('x', 1);
	    subRedis.on('message', function (channel, msg) {
		var obj = JSON.parse(msg);
		assert.equal(channel, core.channel, 'received message on unknown channel.');
		assert(obj.hasOwnProperty('subject'), 'message did not have a subject.')
		assert.equal(obj.subject, 'erased', 'message subject was not unset.');
		done();
	    });

	    subRedis.subscribe(core.channel);
	    subRedis.on('subscribe', function (channel, count) {
		assert.equal(channel, core.channel, 'subscribed to unknown channel.');
		core.erase();
	    });
	});

    });
});
      