
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
	return new Model(options);
    }
    ;

    it('should be constructable', function () {
	assert(newModel({}), 'unable to create a new model');
    });

    describe('#methods', function () {
	it('should exist', function () {
	    assert(newModel({}).methods, 'model did not have a proto property.');
	});

	it('should have the functions from the construction argument', function () {
	    assert(newModel({
		method: function () {}
	    }).methods.method, 'model proto did not have the argument\'s method');
	});
    });

    describe('#create', function () {

	it('should exist and create a new instance', function () {
	    assert(newModel({}).create({}));
	});

	describe('-> instance', function () {

	    it('should should have a core', function () {
		var instance = newModel({}).create({});
		assert(instance.hasOwnProperty('core'), 'new instance did not have a core.');
		assert.equal(typeof instance.core, 'object', 'new instance core was not an object');
	    });

	    it('should have a core with the desired channel prefix', function () {
		var prefix = 'prefix/'
		, instance = newModel({
		    prefix: 'prefix/'
		}).create({});
		assert.equal(0, instance.core.channel.indexOf(prefix));
	    })

	    it('should have initial values equal to the creation arguments', function () {
		var attrs = {x: 1}
		, instance = newModel({}).create(attrs)
		;
		assert.deepEqual(instance.core.toJSON(), attrs, 'initial core did not have provided attributes.');
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
		    assert.deepEqual(attrs, {x: 2}, 'creation argument was mutated');
		});
	    });


	    describe(':initialize', function () {

		it('should be called on creation', function (done) {
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
		    assert(instance.initialized, 'create callback called before initialize');
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
		    instance.method(1)
		});
	    });

	});

    // 	describe(':async', function () {
    // 	    it('should be provided', function (done) {
    // 		newModel({}).create({}, done);
    // 	    });

    // 	    it('should be called after the core has been stored', function (done) {
    // 		var attrs = {x: 1};
    // 		newModel({}).create(attrs, function (err, instance) {
    // 		    assert.ifError(err);
    // 		    var dupCore = new Core(instance.core.channel, redis);
    // 		    dupCore.fetch(function (err) {
    // 			assert.ifError(err);
    // 			assert.deepEqual(dupCore.toJSON(), attrs);
    // 			return done();
    // 		    });
    // 		});
    // 	    });

    // 	    it('should be called after initialization', function (done) {
    // 		var instance = newModel({
    // 		    initialize: function () {
    // 			this.initialized = true;
    // 		    }
    // 		}).create({}, function () {
    // 		    assert(this.initialized, 'create callback called before initialize');
    // 		});
    // 	    });
    // 	});

    });

    describe('#get', function () {
	it('should retrieve an object with a core of the same channel', function () {
	    var model = newModel({});
	    model.create({}, function (err, instance) {
		assert.ifError(err);
		var dup = model.get(instance.core.channel);
		assert.equal(dup.core.channel, instance.core.channel, 'fetched channel was not correct.');
	    });
	});
    });

    describe(':initialize', function () {
	it('should not be called by fetch', function () {
	    var model = newModel({
		initialize: function () {
		    this.initialized = true;
		}
	    });
	    model.create({}, function (err, instance) {
		var dup = model.get(instance.core.channel);
		assert(!dup.initialized);
	    });
	});
    });

    describe(':methods', function () {
	it('should exist on gotten instances', function () {
	    var model = newModel({
		methods: {
		    method: function (arg) {
			assert(this.core, 'method was not called with a context containing the core.');
			assert.equal(arg, 1, 'method was not called with arguments');
		    }
		}
	    });

	    var instance = model.create({})
	    , dup = model.get(instance.core.channel)
	    ;
	    assert(dup.method, 'instance was not gotten with the defined method'); 
	    assert.equal(typeof dup.method, 'function', 'instance was not gotten with the defined method as a function');
	    dup.method(1)
	});
    });
});
