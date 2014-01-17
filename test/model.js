/*jslint node: true */
"use strict";
var venacava = require('../venacava.js')
, Core = venacava.Core
, Model = venacava.Model
, assert = require('assert')
, EventEmitter = require('events').EventEmitter
;

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};


describe('Model', function () {

    var redis
    , newModel = function (options) {
        return new Model(randomId(), options);
    }
    ;

    it('should be constructable', function () {
        assert(newModel({}), 'unable to create a new model');
    });

    it('should have a name', function () {
        assert(newModel({}).hasOwnProperty('name'), 'model does not have a name');
    });

    describe('#Core', function () {
        it('should exist', function () {
            assert(newModel({}).Core);
        });

        it('should be overridable', function () {
            var Core = function() {}
            , model = newModel({
                Core: Core
            })
            ;
            assert.equal(Core, model.Core);
        });

        it('should be the parent type of instance cores', function () {
            var Core = function() {}
            , model = newModel({
                Core: Core
            })
            , instance = model.get(randomId())
            ;

            assert(instance.core instanceof Core);
        });

        it('should receive the options argument', function () {
            var opts = { x: '1' }
            , Core = function(channel, options) {
                this.options = options;
            }
            , model = newModel({
                Core: Core
            })
            , instance = model.get(randomId(), opts)
            ;
            assert.deepEqual(opts, instance.core.options);
        });

    });


    describe('#methods', function () {
        it('should exist', function () {
            assert(newModel({}).methods, 'model did not have the methods property.');
        });

        it('should have the functions from the construction argument', function () {
            assert(newModel({
                methods: {
                    method: function () {}
                }
            }).methods.method, 'model proto did not have the argument\'s method');
        });
    });

    describe('#createIfNotExists', function () {
        it('should exist and create a new instance', function (done) {
            var id = randomId();
            return newModel({}).createIfNotExists(id, {x: 1}, function (err, instance) {
                assert.ifError(err);
                assert(instance);
                done();
            });
        });

        it('should call initialize on non-existant channels', function (done) {
            var numCalled = 0
            , model = newModel({
                initialize: function () {
                    numCalled = numCalled + 1;
                }
            })
            , id = randomId()
            ;
            return model.createIfNotExists(id, {x: 1}, function (err, instance) {
                assert.ifError(err);
                assert.equal(1,numCalled);
                done();
            });
        });

        it('should not call initialize on existant channels', function (done) {
            var numCalled = 0
            , model = newModel({
                initialize: function () {
                    numCalled = numCalled + 1;
                }
            })
            , id = model.create({x: 1}).id
            ;

            assert.equal(1, numCalled);

            return model.createIfNotExists(id, {x: 1}, function (err, instance) {
                assert.ifError(err);
                assert.equal(1,numCalled);
                done();
            });
        });

        it('should have initial values equal to defaults when no attrs provided', function (done) {
            var numCalled = 0
            , model = newModel({
                defaults: {
                    x: 1
                }
            })
            ;
            return model.createIfNotExists(randomId(), function (err, instance) {
                assert.ifError(err);
                instance.core.fetch(function (err) {
                    assert.ifError(err);
                    assert.equal(instance.core.get('x'), 1);
                    done();
                });
            });
        });

        it('should have initial values equal to the creation arguments', function (done) {
            var attrs = {x: 1}
            , model = newModel({})
            ;

            return model.createIfNotExists(randomId(), attrs, function (err, instance) {
                assert.ifError(err);
                assert.deepEqual(instance.core.toJSON(), attrs, 'initial core did not have provided attributes.');
                done();
            });
        });

        it('should return the object to be created', function (done) {
            var model = newModel({})
            , instance = model.createIfNotExists(randomId(), function (err, cbInstance) {
                assert.ifError(err);
                assert.equal(instance, cbInstance);
                done();
            })
            ;
        });

    });

    describe('#create', function () {

        it('should exist and create a new instance', function () {
            assert(newModel({}).create({x: 1}));
        });

        describe('-> instance', function () {

            it('should have a core', function () {
                var instance = newModel({}).create({x: 1});
                assert(instance.hasOwnProperty('core'), 'new instance did not have a core.');
                assert.equal(typeof instance.core, 'object', 'new instance core was not an object');
            });

            it('should have an id', function () {
                assert(newModel({}).create({x: 1}).hasOwnProperty('id'));
            });

            it('should have a channel property equal to the core channel', function () {
                var instance = newModel({}).create({x: 1});
                assert(instance.hasOwnProperty('channel'), 'new instance did not have a channel.');
                assert.equal(instance.channel, instance.core.channel);
            });

            it('should have a core channel prefixed with the model name', function () {
                var model = newModel({})
                , instance = model.create({x: 1})
                ;
                assert.equal(0, instance.channel.indexOf(model.name));
            });

            it('should initialize with distinct channel names', function () {
                var model = newModel({});
                assert.notEqual(model.create({x: 1}).channel
                                , model.create({x: 1}).channel);

            });

            it('should have initial values equal to the creation arguments', function () {
                var attrs = {x: 1}
                , instance = newModel({}).create(attrs)
                ;
                assert.deepEqual(instance.core.toJSON(), attrs);
            });

            describe(':defaults', function () {
                it('should have default values from instance creation', function () {
                    var attrs = {x: 1}
                    , instance = newModel({
                        defaults: attrs
                    }).create({})
                    ;
                    assert.deepEqual(instance.core.toJSON(), attrs, 'initial core did not have default attributes.');
                });

                it ('should override defaults with creation parameter', function () {
                    var attrs = {x: 2}
                    , instance = newModel({
                        defaults: {
                            x: 1
                            , y: 1
                        }
                    }).create(attrs)
                    ;
                    assert.deepEqual(instance.core.toJSON(), {
                        x: 2
                        , y: 1
                    }, 'initial core defaults were not overriden by creation argument.');
                    assert.deepEqual(attrs, {x: 2});
                });
            });


            describe(':initialize', function () {
 
                it('should be called by create', function (done) {
                    newModel({
                        initialize: function () {
                            return done();
                        }
                    }).create({});
                });


                it('should be called with an initialized core', function (done) {
                    var attrs = {x: 1};
                    newModel({
                        defaults: attrs
                        , initialize: function () {
                            assert.equal(typeof this.core, 'object', 'initialze called with a core which was not an object');
                            assert.deepEqual(this.core.toJSON(), attrs, 'core was not properly initialized before initialize method was called');
                            return done();
                        }
                    }).create({});
                });

                it('should be called synchronously', function () {
                    var instance = newModel({
                        initialize: function () {
                            this.initialized = true;
                        }
                    }).create({});
                    assert(instance.initialized, 'create callback did not invoke initialized on the instance');
                }); 


                it('should not be called by get', function () {
                    var numCalled = 0;
                    var model = newModel({
                        initialize: function () {
                            numCalled = numCalled + 1;
                        }
                    });

                    model.get(randomId());
                    assert.equal(0, numCalled);
                });

                it('should get a model with the provided id', function () {
                    var model = newModel({})
                    , instance = model.create({})
                    ;
                    assert.equal(instance.channel, model.get(instance.id).channel);                 
                });
                
            });
            
            describe(':methods', function () {
                it('should exist on created instances', function () {
                    var instance = newModel({
                        methods: {
                            method: function (arg) {
                                assert(this.core, 'method was not called with a context containing the core.');
                                assert.equal(arg, 1, 'method was not called with arguments');
                            }
                        }
                    }).create({});
                    assert(instance.method, 'instance was not created with the defined method'); 
                    assert.equal(typeof instance.method, 'function', 'instance was not created with the defined method as a function');
                    instance.method(1);
                });
            });

        });

    //  describe(':async', function () {
    //      it('should be provided', function (done) {
    //          newModel({}).create({}, done);
    //      });

    //      it('should be called after the core has been stored', function (done) {
    //          var attrs = {x: 1};
    //          newModel({}).create(attrs, function (err, instance) {
    //              assert.ifError(err);
    //              var dupCore = new Core(instance.core.channel, redis);
    //              dupCore.fetch(function (err) {
    //                  assert.ifError(err);
    //                  assert.deepEqual(dupCore.toJSON(), attrs);
    //                  return done();
    //              });
    //          });
    //      });

    //      it('should be called after initialization', function (done) {
    //          var instance = newModel({
    //              initialize: function () {
    //                  this.initialized = true;
    //              }
    //          }).create({}, function () {
    //              assert(this.initialized, 'create callback called before initialize');
    //          });
    //      });
    //  });

    });

    describe('#get', function () {
        it('should retrieve an object with a core of the same channel', function () {
            var model = newModel({})
            , instance = model.create({})
            , dup = model.get(instance.id)
            ;
            assert.equal(dup.channel, instance.channel);
        });
    });

    describe(':initialize', function () {
        it('should not be called by get', function () {
            var model = newModel({
                initialize: function () {
                    this.initialized = true;
                }
            })
            , instance = model.create({})
            , dup = model.get(instance.id)
            ;
            assert(!dup.initialized);
        });
    });

    describe(':methods', function () {
        it('should exist on instances obtained from #get', function () {
            var model = newModel({
                methods: {
                    method: function (arg) {
                        assert(this.core, 'method was not called with a context containing the core.');
                        assert.equal(arg, 1, 'method was not called with arguments');
                    }
                }
            })
            , instance = model.create({})
            , dup = model.get(instance.channel)
            ;
            assert(dup.method);
            assert.equal('function', typeof dup.method); 
            dup.method(1);
        });
    });
});
