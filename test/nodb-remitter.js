/*jslint node: true */
"use strict";
var venacava = require('../venacava.js')
, remitter = require('../nodb.js').remitter
, assert = require('assert')
, _ = require('underscore')
;


var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};

describe('remitter', function () {

    var newContext = function () {
        return {
            remitter: remitter
        };
    }
    ;

    it('should be constructable', function () {
        assert(newContext().remitter);
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
        , listenB = function (msg) {
            assert.equal(msg[0], channelB);
            messages.push(['b', msg[1]]);
        }
        ;
        context.remitter.subscribe(channelA, listenA);
        context.remitter.subscribe(channelB, listenB);
        context.remitter.publish(channelA, 1);
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
        context.remitter.publish(channel, {
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
        context.remitter.publish(channelA, 1);
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
        , listenB = function (msg) {
            messages.push(['b', msg[1]]);
        }
        ;
        context.remitter.subscribe(channelA, listenA);
        context.remitter.subscribe(channelA, listenB);
        context.remitter.unsubscribe(channelA, listenB);
        context.remitter.publish(channelA, 1);
        assert.equal(1, countABs(messages).a);
        assert(!countABs(messages).b);
    });

});
      