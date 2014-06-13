/*jslint node: true */
"use strict";
var venacava = require('../venacava.js').server(require('../nodb.js'))
, HashCore = venacava.HashCore
, assert = require('assert')
;

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};


describe('nodb HashCore', function () {

    var newCore = function (channel, attrs) {
        if (_.isObject(channel)) {
            attrs = channel;
            channel = randomId();
        }
        else if (!channel) {
            channel = randomId();
        }
        return new HashCore(channel, attrs);
    }
    ;

    it('should be constructable', function () {
        newCore({x: 1});
    });

    it('should have a channel attribute', function () {
        assert(newCore().channel, 'core did not have a channel property');
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
            core.set(newAttrs);
            assert.equal(newAttrs.x, core.get('x'), 'failed to set x through object argument');
            assert.equal(newAttrs.y, core.get('y'), 'failed to set y through object argument');
            assert.equal(attrs.z, core.get('z'), 'failed to preserve z after object argument');
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
            core.unset('x');
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
    });

    describe('#clear', function () {

        it('should exist', function () {
            var core = newCore();
            assert(core.clear, 'core did not have a "clear" property'); 
            assert(typeof core.clear, 'function', '"clear" property was not a function');
        });

        it('should clear all properties', function (done) {
            var core = newCore();
            core.set('x', 1);
            core.clear();
            assert.deepEqual(dup.toJSON(), {}, 'core was not cleared: ' + JSON.stringify(dup.toJSON()));
        });

    });

    describe('remitter subscription', function () {

        var newContext = function () {
            return {
                remitter: venacava.remitter
                , core: newCore()
            };
        };

        it('should send "set" updates', function (done) {
            var context = newContext()
            , remitter = context.remitter
            , core = context.core
            , attrs = {x: 1}
            ;
            remitter.subscribe(core.channel, function (msg) {
                var obj = JSON.parse(msg[1]);
                assert.equal(msg[0], core.channel, 'received message on unknown channel.');
                assert(obj.hasOwnProperty('subject'), 'message did not have a subject.');
                assert.equal(obj.subject, 'set', 'message subject was not "set".');
                assert(obj.hasOwnProperty('body'), 'message did not have a body');
                assert.deepEqual(obj.body, attrs, 'wrong message body');
                done();
            });
            core.set(attrs);
            
            // subRedis.on('subscribe', function (channel, count) {
            //     assert.equal(channel, core.channel, 'subscribed to unknown channel.');
            //     core.set(attrs);
            // });
        });

        it('should send "unset" updates', function (done) {
            var context = newContext()
            , remitter = context.remitter
            , core = context.core
            , attrs = {x: 1}
            ;
            remitter.subscribe(core.channel, function (msg) {
                var obj = JSON.parse(msg[1]);
                assert.equal(msg[0], core.channel, 'received message on unknown channel.');
                assert(obj.hasOwnProperty('subject'), 'message did not have a subject.');
                assert.equal(obj.subject, 'unset', 'message subject was not "unset".');
                assert(obj.hasOwnProperty('body'), 'message did not have a body');
                assert(obj.body.hasOwnProperty('x'), 'message body did not have the expected atribute');
                done();
            });
            core.unset('x');

            // subRedis.subscribe(core.channel);
            // subRedis.on('subscribe', function (channel, count) {
            //     assert.equal(channel, core.channel, 'subscribed to unknown channel.');
            //     core.unset('x');
            // });
        });

        it('should send "unset" updates on clear', function (done) {
            var context = newContext()
            , remitter = context.remitter
            , core = context.core
            , attrs = {x: 1}
            ;
            remitter.subscribe(core.channel, function (msg) {
                var obj = JSON.parse(msg[1]);
                assert.equal(msg[0], core.channel, 'received message on unknown channel.');
                assert(obj.hasOwnProperty('subject'), 'message did not have a subject.');
                assert.equal(obj.subject, 'unset', 'message subject was not "unset".');
                assert(obj.hasOwnProperty('body'), 'message did not have a body');
                assert(obj.body.hasOwnProperty('x'), 'message body did not have the expected atribute');
                done();
            });
            core.clear();

            // subRedis.subscribe(core.channel);
            // subRedis.on('subscribe', function (channel, count) {
            //     assert.equal(channel, core.channel, 'subscribed to unknown channel.');
            //     core.unset('x');
            // });
        });

    });
});
      