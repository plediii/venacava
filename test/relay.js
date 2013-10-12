
var venacava = require('../venacava.js')
, MockRedisSub = require('./mockredissub').MockRedisSub
, MockSocket = require('./mocksocket').MockSocket
, Relay = venacava.Relay
, RedisEmitter = venacava.RedisEmitter
, EventEmitter = require('events').EventEmitter
, assert = require('assert')
, _ = require('underscore')
;

var redisClient = function () {
    return redis.createClient();
};

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};


var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};

describe('relay', function () {

    var mockContext function () {
	var socket = new MockSocket()
	, redissub = new MockRedisSub()
	, remitter = new RedisEmitter(redissub)
	;
	return {
	    socket: socket
	    , redissub; redissub
	    , remitter: remitter
	    , relay: new Relay(socket, remitter)
	};
    };

    it('should be constructable', function () {
	assert(mockContext().relay);
    });

    describe('#subscribe', function () {

	it('should relay subscription requests', function (done) {
	    var context = mockContext()
	    , channel = randomId()
	    ; 
	    context.relay.subscribe(channel);
	    assert.equal(1, context.redissub.subscriptions[channel]);
	});

	it('should cause redis messages to be relayed', function (done) {
	    var context = mockContext()
	    , channel = randomId()
	    ; 
	    context.socket._emit(channel, function (msg) {
		assert.equal(msg, 1);
		done();
	    });
	    context.relay.subscribe(channel);
	    context.redissub._receive(channel, 1);
	});

	it('should not receive messages from channels not subscribed to', function (done) {
	    var context = mockContext()
	    , channel = randomId()
	    ; 
	    context.socket._on(channel, function (msg) {
		assert.equal(msg, 2);
		done();
	    });
	    context.relay.subscribe(channel);
	    context.redissub._receive(randomId(), 1);
	    context.redissub._receive(channel, 2);
	});


	it('should unsubscribe on disconnect', function (done) {
	    var context = mockContext()
	    , channel = randomId()
	    ; 
	    context.socket._on(channel, function (msg) {
		assert.equal(msg, 1);
		return done();
	    });
	    context.relay.subscribe(channel);
	    context.socket._receive('disconnect');
	    assert(!context.redissub.subscriptions[channel]);
	});

    });

});

      