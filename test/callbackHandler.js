
var venacava = require('../venacava')
, redisClient = venacava.redisClient
, CallbackHandler = require('../venacava.js').CallbackHandler
, assert = require('assert')
;

describe('call back handler', function () {

    var cbHandler
    , otherHandler
    ;

    before(function(done) {
        cbHandler = new CallbackHandler('90210');
        otherHandler = new CallbackHandler('90211');
        otherHandler.redispub = redisClient.create();
        otherHandler.redissub = redisClient.create();
        return done();
    });

    it('should return a handler for a callback', function (done) {
        assert(cbHandler.handleCallback(function () {}));
        return done();
    });

    it('should invoke the target callback when the handle is executed from the same handler', function (done) {
        var handle = cbHandler.handleCallback(function () { 
            return done();
        });
        cbHandler.executeCallback(handle);
    });

    it('should invoke the target callback when the handle is executed from another handler', function (done) {
        var handle = cbHandler.handleCallback(function () { 
            return done();
        });
        otherHandler.executeCallback(handle);
    });

    it('should invoke the target callback with a single argument when the handle is executed from the same handler', function (done) {
        var expectedArg = Math.random();
        var handle = cbHandler.handleCallback(function (arg) { 
            assert.equal(arg, expectedArg, 'did not receive expected argument');
            return done();
        });
        cbHandler.executeCallback(handle, [expectedArg]);
    });


    it('should invoke the target callback with a single argument when the handle is executed from the another handler', function (done) {
        var expectedArg = Math.random();
        var handle = cbHandler.handleCallback(function (arg) { 
            assert.equal(arg, expectedArg, 'did not receive expected argument');
            return done();
        });
        cbHandler.executeCallback(handle, [expectedArg]);
    });

    it('should invoke the target callback with multiple arguments when the handle is executed from the same handler', function (done) {
        var expectedArg = Math.random()
        , expectedSecondArg = Math.random()
        ;
        var handle = cbHandler.handleCallback(function (arg, secondArg) { 
            assert.equal(arg, expectedArg, 'did not receive expected first argument');
            assert.equal(secondArg, expectedSecondArg, 'did not receive expected second argument');
            return done();
        });
        cbHandler.executeCallback(handle, [expectedArg, expectedSecondArg]);
    });


    it('should invoke the target callback with multiple arguments when the handle is executed from the another handler', function (done) {
        var expectedArg = Math.random()
        , expectedSecondArg = Math.random()
        ;
        var handle = cbHandler.handleCallback(function (arg, secondArg) { 
            assert.equal(arg, expectedArg, 'did not receive expected first argument');
            assert.equal(secondArg, expectedSecondArg, 'did not receive expected second argument');
            return done();
        });
        otherHandler.executeCallback(handle, [expectedArg, expectedSecondArg]);
    });



});
      