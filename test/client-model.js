/*jslint node: true */
"use strict";
var venaclient = require('../venaclient.js')
, assert = require('assert')
, EventEmitter = require('events').EventEmitter
, _ = require('underscore')
, Backbone = require('backbone')
, MockSocket = require(__dirname + '/mocksocket').MockSocket
;

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};

var newContext = function (options, Model, socketoptions) {

    Model = Model || Backbone.Model;
    var  model = Model.extend({
        urlRoot: name
    })
    , socket = new MockSocket(socketoptions)
    , client = new venaclient.Client(socket)
    , name = randomId()
    ;

    return {
        Model: model
        , name: name
        , socket: socket
        , client: client
        , service: new client.Service(name, model, options)
    };
}
;


describe('venaclient', function () {
    
    describe('#model', function () {

        it('should be constructable', function () {
            assert(newContext().service);
        });

        describe('#available', function () {
            it('should exist', function () {
                assert(newContext().service.hasOwnProperty('available'));
            });

            it('should initially be false', function () {
                assert(!newContext().service.available);
            });

            it('should become true when the server advertises its availability', function () {
                var context = newContext()
                ;
                context.socket._receive(context.name);
                assert(context.service.available);
            });

            it('should become false on socket disconnect', function () {
                var context = newContext()
                ;
                context.socket._receive(context.name);
                context.socket._receive('disconnect');
                assert(!context.service.available);
            });

            it('should emit an availability check on new instances', function () {
                var context = newContext()
                , name = randomId()
                , called = 0
                ;
                context.socket._emit(name, function (msg) {
                    assert(msg.check);
                    called = called + 1;
                });
                var service = new context.client.Service(name, context.Model);
                assert.equal(1, called);
            });

            it('should NOT emit an availability check on new instances when the socket is not connected', function () {
                var context = newContext({}, null, {
                    connected: false
                })
                , name = randomId()
                , called = 0
                ;
                context.socket._emit(name, function (msg) {
                    assert(false);
                });
                var service = new context.client.Service(name, context.Model);
                assert.equal(0, called);
            });

            describe('#events', function () {

                it('should exist', function () {
                    var context = newContext()
                    ;
                    assert(_.isObject(context.service.events));
                });

                it('should emit available when the service becomes available', function (done) {
                    var context = newContext()
                    ;
                    context.service.events.on('available', function () {
                        assert(context.service.available);
                        done();
                    });
                    context.socket._receive(context.name);
                });
                
            });
        });

        describe('#get', function () {

            it('should exist', function () {
                assert.equal(typeof newContext().service.get, 'function');
            });

            it('should provide instances', function () {
                assert(newContext().service.get(randomId()));
            });

            it('should have the service name', function () {
                var context = newContext();
                assert.equal(context.service.name, context.name);
            });

            describe(':instance', function () {

                it('should have the instance id', function () {
                    var id = randomId();
                    assert.equal(newContext().service.get(id).id, id);
                });

                it('should have the instance channel', function () {
                    var id = randomId()
                    , service = newContext().service
                    ;
                    assert.equal(service.get(id).channel, service.name + '/' + id);
                });


                it('should always be the same object for the same id', function () {
                    var context = newContext()
                    , id = randomId()
                    , instance = context.service.get(id)
                    , otherInstance = context.service.get(id)
                    ;
                    instance.x = 1;
                    otherInstance.x = 2;
                    assert.equal(otherInstance.x, instance.x);
                });

                it('should call the initializer when available', function (done) {
                    var context = newContext({
                        initialize: function () {
                            done();
                        }
                    })
                    , id = randomId()
                    , instance = context.service.get(id)
                    ;               
                });


                it('should call the initializer with the instance context', function () {
                    var context = newContext({
                        initialize: function () {
                            this.x = 1;
                        }
                    })
                    , id = randomId()
                    , instance = context.service.get(id)
                    ;               
                    assert.equal(1, instance.x);
                });


                describe('#socket', function () {
                    it('should exist', function () {
                        var context = newContext();
                        assert(_.isObject(context.service.get(randomId()).socket));
                    });

                    it('should be the service socket', function () {
                        var context = newContext();
                        assert.equal(context.service.get(randomId()).socket, context.socket);
                    });
                });


                describe('#model', function () {

                    it('should exist', function () {
                        var context = newContext();
                        assert(_.isObject(context.service.get(randomId()).model));
                    });

                    it('should be of the expected type', function () {
                        var context = newContext();
                        assert(context.service.get(randomId()).model instanceof context.Model);
                    });

                });

                describe('#subscribe', function () {
                    it('should exist', function () {
                        var context = newContext();
                        assert.equal(typeof context.service.get(randomId()).subscribe, 'function');
                    });

                    it('should emit a subscribe event on the socket when the service is available', function () {
                        var context = newContext()
                        , instance = context.service.get(randomId())
                        , called = 0
                        ;
                        context.socket._receive(context.name);
                        context.socket._emit(context.name, function (msg) {
                            assert.equal(msg.method, 'subscribe');
                            assert.equal(msg.id, instance.id);
                            called = called + 1;
                        });
                        instance.subscribe();
                        assert.equal(1, called);
                    });

                    it('should NOT emit a subscribe event on the socket before the service is available', function () {
                        var context = newContext()
                        , instance = context.service.get(randomId())
                        , called = 0
                        ;
                        context.socket._emit(context.name, function (msg) {
                            assert(false);
                        });
                        instance.subscribe();
                        assert.equal(0, called);
                    });

                    it('should re-emit a subscribe event when the service becomes available', function () {
                        var context = newContext()
                        , instance = context.service.get(randomId())
                        , called = 0
                        ;
                        context.socket._receive(context.name);
                        context.socket._emit(context.name, function (msg) {
                            if (msg.method === 'subscribe') {
                                called = 1 + called;
                            }
                        });
                        instance.subscribe();
                        assert.equal(1, called);
                        context.socket._receive(context.name);
                        assert.equal(2, called);
                    });

                    it('should re-emit a subscribe event once each time the service becomes available', function () {
                        var context = newContext()
                        , instance = context.service.get(randomId())
                        , called = 0
                        ;
                        context.socket._receive(context.name);
                        context.socket._emit(context.name, function (msg) {
                            if (msg.method === 'subscribe') {
                                called = 1 + called;
                            }
                        });
                        instance.subscribe();
                        assert.equal(1, called);
                        context.socket._receive(context.name);
                        assert.equal(2, called);
                        context.socket._receive(context.name);
                        assert.equal(3, called);
                    });

                    it('should only emit a subscribe event when not already subscribed', function () {
                        var context = newContext()
                        , instance = context.service.get(randomId())
                        , called = 0
                        ;
                        context.socket._receive(context.name);
                        context.socket._emit(context.name, function (msg) {
                            if (msg.method === 'subscribe') {
                                called = 1 + called;
                            }
                        });
                        instance.subscribe();
                        assert.equal(1, called);
                        instance.subscribe();
                        assert.equal(1, called);
                    });


                    describe('#subscribed', function () {
                        it('should exist', function () {
                            assert(newContext().service.get(randomId()).hasOwnProperty('subscribed'));
                        });

                        it('should be true when the service is subscribed', function () {
                            var context = newContext()
                            , instance = context.service.get(randomId())
                            ;
                            context.socket._receive(context.name);
                            assert(!instance.subscribed);
                            instance.subscribe();
                            assert(instance.subscribed);
                            instance.unsubscribe();
                            assert(!instance.subscribed);
                        });

                        describe('#events', function () {

                            it('should exist', function () {
                                var context = newContext();
                                assert(_.isObject(context.service.get(randomId()).events));
                            });

                            it('should be emitted when the service subscribes', function (done) {
                                var context = newContext()
                                , instance = context.service.get(randomId())
                                ;
                                instance.events.on('subscribed', function (subscribed) {
                                    assert(subscribed);
                                    assert(instance.subscribed);
                                    done();
                                });
                                instance.subscribe();
                                context.socket._receive(context.name);
                            });

                            it('should be emitted when the service is subscribed and the socket disconnects', function (done) {
                                var context = newContext()
                                , instance = context.service.get(randomId())
                                ;
                                instance.subscribe();
                                instance.events.on('subscribed', function (subscribed) {
                                    assert(!subscribed);
                                    assert(!instance.subscribed);
                                    done();
                                });
                                context.socket._receive('disconnect');
                            });

                            it('should be emitted when the service is subscribed and then unsubscribed', function (done) {
                                var context = newContext()
                                , instance = context.service.get(randomId())
                                ;
                                instance.subscribe();
                                instance.events.on('subscribed', function (subscribed) {
                                    assert(!subscribed);
                                    assert(!instance.subscribed);
                                    done();
                                });
                                instance.unsubscribe();
                            });

                        });
                    });

                    it('should trigger "set" updates on the model', function (done) {
                        var context = newContext()
                        , id = randomId()
                        , instance = context.service.get(id)
                        ;
                        instance.subscribe();
                        instance.model.on('change:x', function () {
                            assert.equal(instance.model.get('x'), 1);
                            done();
                        });
                        context.socket._receive(instance.channel, {
                            subject: 'set'
                            , body: {
                                x: 1
                            }
                        });
                    });

                    it('should trigger "unset" updates on the model', function (done) {
                        var context = newContext()
                        , id = randomId()
                        , instance = context.service.get(id)
                        ;
                        instance.subscribe();
                        instance.model.set('x', 1);
                        instance.model.on('change:x', function () {
                            assert(!instance.model.has('x'));
                            done();
                        });
                        context.socket._receive(instance.channel, {
                            subject: 'unset'
                            , body: {
                                x: 1
                            }
                        });
                    });

                    it('should trigger "add" events on the model', function (done) {
                        var context = newContext({}, Backbone.Collection)
                        , id = randomId()
                        , instance = context.service.get(id)
                        , item = {x: 1}
                        ;
                        instance.model.push({y:2}); // decoy
                        instance.subscribe();
                        instance.model.on('add', function (added) {
                            assert(added);
                            assert.equal(item.x, added.attributes.x);
                            done();
                        });
                        context.socket._receive(instance.channel, {
                            subject: 'push'
                            , body: item
                        });

                    });

                });

                describe('#unsubscribe', function () {
                    it('should exist', function () {
                        var context = newContext();
                        assert.equal(typeof context.service.get(randomId()).subscribe, 'function');
                    });

                    it('should not trigger "set" updates on the model afterward', function () {
                        var context = newContext()
                        , id = randomId()
                        , instance = context.service.get(id)
                        , called = 0
                        ;
                        instance.subscribe();
                        instance.model.on('change:x', function () {
                            called = called + 1;
                        });
                        context.socket._receive(instance.channel, {
                            subject: 'set'
                            , body: {
                                x: 1
                            }
                        });
                        instance.unsubscribe();
                        context.socket._receive(instance.channel, {
                            subject: 'set'
                            , body: {
                                x: 2
                            }
                        });
                        assert.equal(called, 1);
                    });

                    it('should not re-emit a subscribe event when the service becomes available again', function () {
                        var context = newContext()
                        , instance = context.service.get(randomId())
                        , called = 0
                        ;
                        context.socket._receive(context.name);
                        context.socket._emit(context.name, function (msg) {
                            if (msg.method === 'subscribe') {
                                called = 1 + called;
                            }
                        });
                        instance.subscribe();
                        assert.equal(1, called);
                        instance.unsubscribe();
                        context.socket._receive(context.name);
                        assert.equal(1, called);

                    });
                });

                describe(':methods', function () {
                    
                    it('should exist', function () {
                        var context = newContext({
                            methods: ['method']
                        });
                        assert.equal(typeof context.service.get(randomId()).method, 'function');
                    });

                    it('should transmit the method over the socket', function (done) {
                        var context = newContext({
                            methods: ['method']
                        })
                        , instance = context.service.get(randomId())
                        ;
                        context.socket._emit(context.service.name, function (msg) {
                            assert(msg);
                            assert.equal(msg.id, instance.id);
                            assert.equal(msg.method, 'method');
                            assert(msg.hasOwnProperty('data'), 'service method invocation msg did not have a data property.');
                            assert.equal(msg.data.x, 1);
                            done();
                        });
                        instance.method({
                            x: 1
                        });
                    });

                    it('should transmit "subscribe" over the socket as if it was a method', function (done) {
                        var context = newContext()
                        , instance = context.service.get(randomId())
                        ;
                        context.socket._receive(context.name);
                        context.socket._emit(context.service.name, function (msg) {
                            assert(msg);
                            assert.equal(msg.id, instance.id);
                            assert.equal(msg.method, 'subscribe');
                            done();
                        });
                        instance.subscribe();
                    });

                    it('should transmit "unsubscribe" over the socket as if it was a method', function (done) {
                        var context = newContext()
                        , instance = context.service.get(randomId())
                        ;
                        context.socket._emit(context.service.name, function (msg) {
                            assert(msg);
                            assert.equal(msg.id, instance.id);
                            if (msg.method === 'unsubscribe') {
                                return done();
                            }
                        });
                        instance.subscribe();
                        instance.unsubscribe();
                    });


                });

                describe('#trigger', function () {
                    
                    it('should respond to watched triggers from the server', function (done) {
                        var context = newContext({
                            methods: ['method']
                            , triggers: {
                                trigger: function (data) {
                                    done();
                                }
                            }
                        })
                        , instance = context.service.get(randomId())
                        ;
                        instance.subscribe();
                        context.socket._receive(instance.channel, {
                            subject: 'trigger'
                            , trigger: 'trigger'
                        });
                    });

                    it('should respond to watched triggers with data from the message', function (done) {
                        var context = newContext({
                            methods: ['method']
                            , triggers: {
                                trigger: function (data) {
                                    assert.equal(1, data.x);
                                    done();
                                }
                            }
                        })
                        , instance = context.service.get(randomId())
                        ;
                        instance.subscribe();
                        context.socket._receive(instance.channel, {
                            subject: 'trigger'
                            , trigger: 'trigger'
                            , data: {x: 1}
                        });
                    });


                    it('should call the trigger method with the instance as context', function (done) {
                        var context = newContext({
                            methods: ['method']
                            , triggers: {
                                trigger: function (data) {
                                    assert.equal(this, instance);
                                    done();
                                }
                            }
                        })
                        , instance = context.service.get(randomId())
                        ;
                        instance.subscribe();
                        context.socket._receive(instance.channel, {
                            subject: 'trigger'
                            , trigger: 'trigger'
                        });
                    });

                });

                
            });

        });

    });

});
