"use strict";
var _ = require('underscore')
, Core = require(__dirname + '/core.js').Core
, inherits = require('util').inherits
;

var log = console.log;

var ListCore = exports.ListCore = function (channel, options) {
    Core.call(this, channel, options);
};

_.defaults(ListCore, Core);
inherits(ListCore, Core);
_.extend(ListCore.prototype, {
    length: function (cb) {
        var _this = this;
        _this.redis.llen(_this.channel, cb);
    }
    , push: function (x, cb) {
        var _this = this;
        _this.redis.rpush(_this.channel, JSON.stringify(x), function (err) {
            if (err) {
                return cb(err);
            }
            else {
                _this.emit('push', x);
            }
        });
    }
    , atIndex: function (idx, cb) {
        var _this = this;
        _this.redis.lindex(_this.channel, idx, function (err, str) {
            if (err) {
                return cb(err);
            }
            else {
                var val;
                try {
                    val = JSON.parse(str);
                }
                catch (e) {
                    return cb(e);
                }
                return cb(null, val);
            }
        });
    }
    , range: function (a, b, cb) {
        var _this = this;
        _this.redis.lrange(_this.channel, a, b - 1, function (err, results) {
            if (err) {
                return cb(err);
            }
            return cb(null, _.map(results, function (str) {
                try {
                    return JSON.parse(str);
                }
                catch (e) {
                    log('failed to parse list elelemtn in db ', result, e);
                    return void 0;
                }
            }));
        });
    }
});
