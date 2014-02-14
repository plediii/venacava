/*jslint node: true */
"use strict";
var venacava = require('../venacava.js')
, nodb = require('../nodb.js')
, Lock = nodb.Lock
, assert = require('assert')
, _ = require('underscore')
;

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};

describe('lock', function () {

    describe('.acquire', function () {

        before(function () {
            assert.equal('function', typeof Lock.acquire);
        });
        
        it('should successfully acquire lock for randomid', function (done) {
            Lock.acquire(randomId(), function (err, acquired) {
                assert.ifError(err);
                assert(acquired);
                done();
            });
        });

        it('should not successfully acquire lock for already locked randomid', function (done) {
            var lockid = randomId();
            Lock.acquire(lockid, function (err, acquired) {
                assert.ifError(err);
                assert(acquired);

                Lock.acquire(lockid, function (err, acquired) {
                    assert.ifError(err);
                    assert(!acquired);
                    done();
                });
            });
        });

    });

    describe('.release', function () {

        before(function () {
            assert.equal('function', typeof Lock.acquire);
        });

        it('should allow a previously acquired lock to be acquired again', function (done) {
            var lockid = randomId();
            Lock.acquire(lockid, function (err, acquired) {
                assert.ifError(err);
                assert(acquired);

                Lock.release(lockid, function (err) {
                    assert.ifError(err);
                    Lock.acquire(lockid, function (err, acquired) {
                        assert.ifError(err);
                        assert(acquired);
                        done();
                    });
                });
            });
        });

    });

});
