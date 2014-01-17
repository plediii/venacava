/*jslint node: true */
"use strict";
var venacava = require('../venacava.js')
, MockRedisSub = require('./mockredissub').MockRedisSub
, RedisEmitter = venacava.RedisEmitter
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

    var newRemitter = function (redis) {
        return new RedisEmitter(redis);
    }
    , newContext = function () {
        var redis = new MockRedisSub();
        return {
            redis: redis
            , remitter: newRemitter(redis)
        };
    }
    ;

    it('should be constructable', function () {
        assert(newContext().remitter);
    });

    it('should subscribe to new channels on the redis subscriber', function () {
        var channel = randomId()
        , context = newContext()
        ;

        context.remitter.subscribe(channel, function () {});
        assert(context.redis.subscriptions.hasOwnProperty(channel));
        assert.equal(context.redis.subscriptions[channel], 1);
    });

    it('should not subscribe on redis given a null listener', function () {
        var channel = randomId()
        , context = newContext()
        ;

        try {
            context.remitter.subscribe(channel, null);
        }
        catch (err) {}
        assert(!context.redis.subscriptions.hasOwnProperty(channel));
    });

    
    it('should unsubscribe on the redis subscriber when the listener unsubscribes', function () {
        var channel = randomId()
        , context = newContext()
        , listener = function () {}
        ;
        
        context.remitter.subscribe(channel, listener);
        context.remitter.unsubscribe(channel, listener);
        assert(!context.redis.subscriptions.hasOwnProperty(channel));
    });

    it('should not unsubscribe when there are remaining listeners', function () {
        var channel = randomId()
        , context = newContext()
        , listener = function () {}
        ;
        
        context.remitter.subscribe(channel, listener);
        context.remitter.subscribe(channel, function () {});
        context.remitter.unsubscribe(channel, listener);
        assert.equal(context.redis.subscriptions[channel], 1);
    });

    it('should unsubscribe when all listeners have unsubscribed', function () {
        var channel = randomId()
        , context = newContext()
        , listener = function () {}
        , listener2 = function () {}
        ;
        
        context.remitter.subscribe(channel, listener);
        context.remitter.subscribe(channel, listener2);
        context.remitter.unsubscribe(channel, listener);
        context.remitter.unsubscribe(channel, listener2);
        assert(!context.redis.subscriptions.hasOwnProperty(channel));
    });

    it('should relay messages on subscribed channel to listener', function () {

        var channelA = randomId()
        , channelB = randomId()
        , context = newContext()
        , messages = []
        , listenA = function (msg) {
            assert.equal(msg[0], channelA);
            messages.push(['a', msg[1]]);
        }
        , countB = 0
        , listenB = function () {
            assert.equal(msg[0], channelB);
            messages.push(['b', msg[1]]);
        }
        ;
        context.remitter.subscribe(channelA, listenA);
        context.remitter.subscribe(channelB, listenB);
        context.redis._receive(channelA, 1);
        assert.deepEqual(messages, [['a', 1]]);
    });

    it('should relay complex messages on subscribed channel to listener', function (done) {

        var channel = randomId()
        , context = newContext()
        , messages = []
        , listen = function ( msg) {
            assert(msg[1].hasOwnProperty('tag'));
            assert.equal(msg[1].tag, 'test');
            done();
        }
        ;
        context.remitter.subscribe(channel, listen);
        context.redis._receive(channel, {
            tag: 'test'
        });
    });

    var countABs = function (arr) {
        return _.countBy(arr, function (elt) {
            return elt[0];
        });
    };

    it('should relay messages on subscribed channel to all listeners', function () {

        var channelA = randomId()
        , channelB = randomId()
        , context = newContext()
        , messages = []
        , listenA = function (msg) {
            assert.equal(msg[0], channelA);
            messages.push(['a', msg[1]]);
        }
        , listenB = function (msg) {
            messages.push(['b', msg[1]]);
        }
        ;
        context.remitter.subscribe(channelA, listenA);
        context.remitter.subscribe(channelA, listenB);
        context.redis._receive(channelA, 1);
        assert.equal(1, countABs(messages).a);
        assert.equal(1, countABs(messages).b);
    });

    it('should not relay messages to unsubscribed listeners', function () {

        var channelA = randomId()
        , channelB = randomId()
        , context = newContext()
        , messages = []
        , listenA = function (msg) {
            messages.push(['a', msg[1]]);
        }
        , listenB = function () {
            messages.push(['b', msg[1]]);
        }
        ;
        context.remitter.subscribe(channelA, listenA);
        context.remitter.subscribe(channelA, listenB);
        context.remitter.unsubscribe(channelA, listenB);
        context.redis._receive(channelA, 1);
        assert.equal(1, countABs(messages).a);
        assert(!countABs(messages).b);
    });

});
      