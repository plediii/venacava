
var _ = require('underscore')
;

var log = console.log;

var Core = exports.Core = function (channel, attrs) {
    this.channel = channel;
    this._attrs = attrs || {};
    this._redis = Core._redis;
};

Core._redis = require(__dirname + '/redisClient').create();

_.each(['exists', 'erase'], function (funcName) {
    Core[funcName] = function (channel) {
	var core = new Core(channel);
	return core[funcName].apply(core, _.toArray(arguments).slice(1));
    }
});

_.extend(Core.prototype, {
    set: function (key, val, cb) {
	var _this = this
	, attrs = key
	, _redis = _this._redis
	, channel = _this.channel
	;
	if (typeof key !== 'object') {
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
		_redis.publish(_this.channel, JSON.stringify({
		    subject: 'set'
		    , body: attrs
		}));
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
	return _this._redis.hdel(_this.channel, _.keys(targets), function (err) {
	    if (err) {
		if (cb) {
		    return cb(err);
		}
	    }
	    else {
		_this._redis.publish(_this.channel, JSON.stringify({
		    subject: 'unset'
		    , body: targets
		}));
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

	return _this._redis.hgetall(_this.channel, function (err, attrs) {
	    if (err) {
		return cb(err);
	    }
	    else {
		if (attrs && typeof attrs === 'object') {
		    _.each(attrs, function (val, key) {
			attrs[key] = JSON.parse(val);
		    });		    
		    _this._attrs = attrs;
		    return cb(null)
		}
		else {
		    return cb(null);
		}
	    }
	}); 
    }
    , exists: function (cb) {
	var _this = this
	;
	_this._redis.exists(_this.channel, cb);
    }
    , erase: function (cb) {
	var _this = this
	, channel = _this.channel
	;
	cb = cb || logError('error erasing ' + channel);
	_this._redis.del(channel, function (err) {
	    if (err) {
		return cb(err);
	    }
	    else {
		_this._redis.publish(channel, JSON.stringify({
		    subject: 'erased'
		}));
		return cb(null);
	    }
	});

    }
});

var logError = function (message) {
    return function (err) {
	if (err) {
	    log(message, err);
	}
    };
}