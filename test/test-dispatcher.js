
var venacava = require('../venacava.js')
, Dispatcher = venacava.Dispatcher
, assert = require('assert')
, _ = require('underscore')
;
describe('Dispatcher', function () {


    var newDispatcher = function () {
	return new Dispatcher();
    };

    before(function(done) {
	// redis = redisClient();
	return done();
    });

    it('should be constructable', function () {
	assert(newDispatcher());
    });

    it('should allow adding subscribers', function () {
	assert(newDispatcher().add(function () {}));
    });

    describe('#dispatch', function () {
	it('should exist', function () {
	    assert(newDispatcher().dispatch);
	});

	it('should return a function', function () {
	    assert.equal(typeof mockContext().dispatcher.dispatch({}),
			 'function');
	}); 

	it('should call the subscribers when invoked', function (done) {
	    var dispatcher = newDispatcher()
	    , argData = {}
	    , argMsg = {}
	    ;
	    dispatcher.add(function (data, msg) {
		assert.equal(msg, argMsg);
		assert.equal(data, argData);
		done();
	    });
	    dispatcher.dispatch(argData)(argMsg);
	});

	it('should call subscribers in the reverse order they were added', function (done) {
	    var dispatcher = newDispatcher()
	    , argData = {}
	    , argMsg = {}
	    , firstCalled = false;
	    ;
	    dispatcher.add(function (data, msg) {
		assert.equal(msg, argMsg);
		assert.equal(data, argData);
		assert(firstCalled);
		done();
	    });
	    dispatcher.add(function (data, msg) {
		assert.equal(msg, argMsg);
		assert.equal(data, argData);
		firstCalled = true;
		return false;
	    });
	    dispatcher.dispatch(argData)(argMsg);
	    
	});

	it('should call stop calling subscribers after the first to return truthy', function () {
	    var dispatcher = newDispatcher()
	    , argData = {}
	    , argMsg = {}
	    ;
	    dispatcher.add(function (data, msg) {
		assert(false);
	    });
	    dispatcher.add(function (data, msg) {
		return true;
	    });
	    dispatcher.dispatch(argData)(argMsg);
	});
    });
});

      