
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

describe('Relay', function () {

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


    before(function(done) {
	// redis = redisClient();
	return done();
    });

    it('should be constructable', function () {
	assert(mockContext().relay);
    });

    it('should relay subscription requests', function (done) {
	var context = mockContext()
	, channel = randomId()
	; 
	context.socket._receive('subscribe', channel);
	assert.equal(1, context.redissub.subscriptions[channel]);
    });

    it('should relay redis messages', function () {
	var context = mockContext()
	, channel = randomId()
	; 
	context.socket._on(channel, function (msg) {
	    assert.equal(msg, 1);
	});
	context.socket._receive('subscribe', channel);
	context.redissub._emit(channel, 1);
    });

    it('should not receive messages from channels not subscribed to', function () {
	var context = mockContext()
	, channel = randomId()
	; 
	context.socket._on(channel, function (msg) {
	    assert(false);
	});
	context.socket._receive('subscribe', channel);
	context.redissub._emit(randomId(), 1);
    });


    it('should unsubscribe on disconnect', function (done) {
	var context = mockContext()
	, channel = randomId()
	; 
	context.socket._on(channel, function (msg) {
	    assert.equal(msg, 1);
	    return done();
	});
	context.socket._receive('subscribe', channel);
	context.socket._receive('disconnect');
	assert(!context.redissub.subscriptions[channel]);
    });



});

      