"use strict";
var _ = require('underscore')
, Core = require(__dirname + '/core.js').Core
, inherits = require('util').inherits
;

var log = console.log;

var HashCore = exports.HashCore = function (channel, attrs, options) {
    Core.call(this, channel, options);
    this._attrs = attrs || {};
};

_.defaults(HashCore, Core);
inherits(HashCore, Core);
_.extend(HashCore.prototype, {
    initialize: function (attrs, options) {
        var _this = this;
        _this.set(attrs);
    }
    , set: function (key, val, cb) {
        var _this = this
        , attrs = key
        , _redis = _this.redis
        , channel = _this.channel
        ;
        if (!_.isObject(key)) {
            (attrs = {})[key] = val;
        }
        else {
            cb = val;
        }
        _.extend(_this._attrs, attrs);
        var hmsetArgs = [channel];
        _.each(attrs, function (val, key) {
            hmsetArgs.push(key);
            hmsetArgs.push(JSON.stringify(val));
        });
        hmsetArgs.push(function (err) {
            if (err) {
                if (cb) {
                    cb(err);
                }
            }
            else {
                _this.emit('set', attrs);
                if (cb) {
                    return cb(null);
                }
            }
        });
        _redis.hmset.apply(_redis, hmsetArgs);
    }
    , get: function (key) {
        return this._attrs[key];
    }
    , has: function (key) {
        return this._attrs.hasOwnProperty(key);
    }
    , unset: function (key, cb) {
        var _this = this
        , targets = {}
        , attrs = _this._attrs
        ;
        if (typeof key === 'object') {
            _.each(key, function (val, target) {
                targets[target] = null;
                delete attrs[target];
            });
        }
        else { 
            (targets = {})[key] = null;
            delete attrs[key];
        }
        return _this.redis.hdel(_this.channel, _.keys(targets), function (err) {
            if (err) {
                if (cb) {
                    return cb(err);
                }
            }
            else {
                _this.emit('unset', targets);
                if (cb) {
                    return cb(null);
                }
            }
        });
    }
    , clear: function (cb) {
        var _this = this
        ;
        _this.unset(_this.toJSON(), cb);
    }
    , toJSON: function () {
        return _.clone(this._attrs);
    }
    , fetch: function (cb) {
        var _this = this
        ; 

        return _this.redis.hgetall(_this.channel, function (err, attrs) {
            if (err) {
                return cb(err);
            }
            else {
                if (attrs && typeof attrs === 'object') {
                    _.each(attrs, function (val, key) {
                        try {
                            attrs[key] = JSON.parse(val);
                        }
                        catch (e) {
                            log('bad json in database: ', _this.channel, attrs);
                        }
                    });             
                    _this._attrs = attrs;
                    if (cb) {
                        return cb(null);
                    }
                }
                else {
                    if (cb) {
                        return cb(null);
                    }
                }
            }
        }); 
    }
});

