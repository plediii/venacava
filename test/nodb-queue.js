/*jslint node: true */
"use strict";
var venacava = require('../venacava')
, queue = require('../nodb.js').queue
, assert = require('assert')
;

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};


describe('queue ', function () {


    var newQueue = function (name) {
        return queue(name || randomId());
    };


    it('should be constructable', function () {
        assert(newQueue());
    });

    it('should support enqueing', function (done) {
        var q = newQueue()
        , x = Math.random()
        ;
        
        q.enqueue({ x: x });
        q.next(function (err, result) {
            assert.ifError(err);
            assert.deepEqual({ x: x }, result);
            done();
        });
    });

    it('should return successively queued items in original order', function (done) {
        var q = newQueue()
        , x = Math.random()
        , y = Math.random()
        ;
        
        q.enqueue({ x: x });
        q.enqueue({ y: y });
        q.next(function (err, result) {
            assert.ifError(err);
            assert.deepEqual({ x: x }, result);

            q.next(function (err, result) {
                assert.ifError(err);
                assert.deepEqual({ y: y }, result);
                done();
            });

        });
    });

    it('should provide distinct queues', function (done) {
        var q = newQueue()
        , r = newQueue()
        , x = Math.random()
        ;
        
        q.enqueue({ x: x });
        r.next(function (err, result) {
            assert.ifError(err);
            assert(!result);
            done();
        });
    });

    it('should provide the same queue for the same name', function (done) {
        var q = newQueue()
        , r = newQueue(q.name())
        , x = Math.random()
        ;
        
        q.enqueue({ x: x });
        r.next(function (err, result) {
            assert.ifError(err);
            assert.deepEqual({ x: x }, result);
            done();
        });
    });

    it('should provide ability to erase queues', function (done) {
        var q = newQueue()
        , x = Math.random()
        ;
        
        q.enqueue({ x: x });
        q.del(function (err) {
            assert.ifError(err);

            q.next(function (err, result) {
                assert.ifError(err);
                assert(!result);
                done();
            });
        });
    });

});
      