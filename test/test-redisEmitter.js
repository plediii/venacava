
var venacava = require('../venacava.js')
, MockRedisSub = require('./mockredissub').MockRedisSub
, RedisEmitter = venacava.RedisEmitter
, redis = require('redis')
, assert = require('assert')
, _ = require('underscore')
;

var redisClient = function () {
    return redis.createClient();
};

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};

describe('RedisEmitter', function () {

    var redis
    ;

    var newRemitter = function (theRedis) {
	theRedis = theRedis || redis;
	return new RedisEmitter(redis);
    };



    before(function(done) {
	redis = redisClient();
	return done();
    });

    it('should be constructable', function () {
	newRemitter(redis);
    });

    it('should subscribe to new channels on the redis subscriber', function () {
	var channel = randomId()
	, redisSub = new MockRedisSub()
	, remitter = newRemitter(redisSub)
	;
	
	remitter.subscribe(channel);
	assert.equal(redisSub.subscriptions[channel], 1);
    });


    it('should only subscribe to new channels on the redis subscriber for the first listener', function () {
	var channel = randomId()
	, redisSub = new MockRedisSub()
	, remitter = newRemitter(redisSub)
	;
	
	remitter.subscribe(channel, function () {});
	remitter.subscribe(channel, function () {});
	assert.equal(redisSub.subscriptions[channel], 1);
    });

    it('should unsubscribe on the redis subscriber when the listener unsubscribes', function () {
	var channel = randomId()
	, redisSub = new MockRedisSub()
	, remitter = newRemitter(redisSub)
	, listener = function () {}
	;
	
	remitter.subscribe(channel, listener);
	remitter.unsubscribe(channel, listener)
	assert(!redisSub.hasOwnProperty(channel));
    });

    it('should not unsubscribe when there are remaining listeners', function () {
	var channel = randomId()
	, redisSub = new MockRedisSub()
	, remitter = newRemitter(redisSub)
	, listener = function () {}
	;
	
	remitter.subscribe(channel, listener);
	remitter.subscribe(channel, function () {});
	remitter.unsubscribe(channel, listener);
	assert.equal(redisSub.subscriptions[channel], 1);
    });

    it('should unsubscribe when all listeners have unsubscribed', function () {
	var channel = randomId()
	, redisSub = new MockRedisSub()
	, remitter = newRemitter(redisSub)
	, listener = function () {}
	, listener2 = function () {}
	;
	
	remitter.subscribe(channel, listener);
	remitter.subscribe(channel, listener2);
	remitter.unsubscribe(channel, listener);
	remitter.unsubscribe(channel, listener2);
	assert(!redisSub.hasOwnProperty(channel));
    });

    it('should relay messages on subscribed channel to listener', function () {

	var channelA = randomId()
	, channelB = randomId()
	, redisSub = new MockRedisSub()
	, remitter = newRemitter(redisSub)
	, messages = []
	, listenA = function (msg) {
	    messages.push(['a', msg]);
	}
	, countB = 0
	, listenB = function () {
	    messages.push(['b', msg]);
	}
	;
	remitter.subscribe(channelA, listenA);
	remitter.subscribe(channelB, listenB);
	redisSub._emit(channelA, 1);
	assert.deepEqual(messages, [['a', 1]]);
    });

    it('should relay messages on subscribed channel to all listeners', function () {

	var channelA = randomId()
	, channelB = randomId()
	, redisSub = new MockRedisSub()
	, remitter = newRemitter(redisSub)
	, messages = []
	, listenA = function (msg) {
	    messages.push(['a', msg]);
	}
	, countB = 0
	, listenB = function () {
	    messages.push(['b', msg]);
	}
	;
	remitter.subscribe(channelA, listenA);
	remitter.subscribe(channelA, listenB);
	redisSub._emit(channelA, 1);
	assert.equal(1, _.countBy(messages, function (elt) {
	    return elt[0] === 'a' && elt[1] === 1;
	}));
	assert.equal(1, _.countBy(messages, function (elt) {
	    return elt[0] === 'b' && elt[1] === 1;
	}));
    });

    it('should not relay messages to unsubscribed listeners', function () {

	var channelA = randomId()
	, channelB = randomId()
	, redisSub = new MockRedisSub()
	, remitter = newRemitter(redisSub)
	, messages = []
	, listenA = function (msg) {
	    messages.push(['a', msg]);
	}
	, countB = 0
	, listenB = function () {
	    messages.push(['b', msg]);
	}
	;
	remitter.subscribe(channelA, listenA);
	remitter.subscribe(channelA, listenB);
	remitter.unsubscribe(channelA, listenB);
	redisSub._emit(channelA, 1);
	assert.equal(1, _.countBy(messages, function (elt) {
	    return elt[0] === 'a' && elt[1] === 1;
	}));
	assert.equal(0, _.countBy(messages, function (elt) {
	    return elt[0] === 'b' && elt[1] === 1;
	}));
    });

});
      