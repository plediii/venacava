
var ListCore = require('../venacava.js').ListCore
, assert = require('assert')
, redisClient = require('../src/redisClient')
, _ = require('underscore')
;

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};


describe('list-core', function () {

    var newCore = function (channel) {
        if (!channel) {
            channel = randomId();
        }
        return new ListCore(channel);
    }
    ;

    it('should be constructable', function () {
        newCore();
    });

    it('should have a channel attribute', function () {
        assert(newCore().channel, 'core did not have a channel property');
    });

    describe('#length', function () {
        
        it('should exist', function () {
            assert.equal('function', typeof newCore().length);
        });

        it('should asynchronously return zero for a new list', function (done) {
            
            newCore().length(function (err, len) {
                assert.ifError(err);
                assert.equal(0, len);
                done();
            });

        });

        it('should asynchronously return one for a new list which has been pushed to', function (done) {
            var instance = newCore();
            instance.push(1);
            instance.length(function (err, len) {
                assert.ifError(err);
                assert.equal(1, len);
                done();
            });
        });
    });

    describe('#push', function () {

        it('should exist', function () {
            assert('function', typeof newCore().push);
        });

        it('should create a list of length one when called on a new list', function (done) {
            var instance = newCore();
            instance.push(1);
            instance.length(function (err, len) {
                assert.ifError(err);
                assert.equal(1, len);
                done();
            });
        });

        it('should create a list of length two when called twice on a new list', function (done) {
            var instance = newCore();
            instance.push(1);
            instance.push(2);
            instance.length(function (err, len) {
                assert.ifError(err);
                assert.equal(2, len);
                done();
            });
        });
    });


    describe('#atIndex', function () {
        it('should exist', function () {
            assert.equal('function', typeof newCore().atIndex);
        });

        it('should yield the zero based element pushed (one)', function (done) {
            var instance = newCore()
            , one = {x: 1}
            , two = {y : 2}
            ;
            instance.push(one);
            instance.push(two);
            instance.atIndex(0, function (err, x) {
                assert.ifError(err);
                assert.equal(x.x, one.x);
                done();
            });
        });

        it('should yield the zero based element pushed (two)', function (done) {
            var instance = newCore()
            , one = {x: 1}
            , two = {y : 2}
            ;
            instance.push(one);
            instance.push(two);
            instance.atIndex(1, function (err, x) {
                assert.ifError(err);
                assert.equal(x.y, two.y);
                done();
            });
        });
        
    });


    describe('#range', function () {
        
        it('should exist', function () { 
            assert.equal('function', typeof newCore().range);
        });

        it('should return the zero based indexed range of objects', function (done) {
            var instance = newCore() 
            , size = 10
            , a = 2
            , b = 5
            ;
            
            _.each(_.range(size), function (idx) {
                instance.push({x: idx});
            });
            instance.range(a, b, function (err, content) {
                assert.ifError(err);
                assert(content);
                assert.equal(b - a, content.length);
                _.each(_.zip(_.range(a, b), content), function (elt) {
                    var idx = elt[0]
                    , obj = elt[1]
                    ;
                    assert.equal(obj.x, idx);
                });
                done();
            });
        });

    });

    describe('redis subscription', function () {

        it('should send "push" updates', function (done) {
            var subRedis = redisClient.create()
            , core = newCore()
            , pushee = {x: 1}
            ;
            subRedis.on('message', function (channel, msg) {
                var obj = JSON.parse(msg);
                assert.equal(channel, core.channel);
                assert(obj.hasOwnProperty('subject'));
                assert.equal(obj.subject, 'push');
                assert(obj.hasOwnProperty('body'));
                assert.equal(obj.body.x, pushee.x);
                done();
            });

            subRedis.on('subscribe', function (channel, count) {
                assert.equal(channel, core.channel);
                core.push(pushee);
            });
            subRedis.subscribe(core.channel); 
        });
    });

});
      