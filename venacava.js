
var _ = require('underscore')
, EventEmitter = require('events').EventEmitter
, crypto = require('crypto')
, proxy = require(__dirname + '/src/proxy')
, callbackHandler = require(__dirname + '/src/callbackHandler')
;
// model proxy enqeues prototype functions to be called.  if there is nothing on the target queue, it will start invoking the prototype functions

var log = console.log;

exports.CallbackHandler = callbackHandler.CallbackHandler;

var callbackChannel = function (zip) {
    return 'callback' + zip;
};




var random_string = exports.random_string = function () {
    return crypto.randomBytes(12).toString('hex');
};

var redisClient = function (args) {
    return redis.createClient.apply(redis, redisArgs);
};


var Core = exports.Core = function (channel, redis, attrs) {
    this.channel = channel;
    this._attrs = attrs || {};
    this._redis = redis;
};

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
});

var Model = exports.Model = function (redis, proto) {
    var _this = this
    ;
    _this._redis = redis;
    _this.defaults = {};
    _this.Klass = function (core) {
	this.core = core;
    };
    _this.proto = proto;
    _this.defaults = proto.defaults;

    _.extend(_this.Klass.prototype, proto);
};

_.extend(Model.prototype, {
    create: function (attrs) {
	var _this = this
	;
	attrs = _.defaults(_.clone(attrs), _this.defaults);
	var instance = _this.get(random_string());
	instance.core.set(attrs);
	instance.initialize && instance.initialize();
	return instance;	
    }
    , get: function (channel) {
	var _this = this;
	return new _this.Klass(new Core(channel, _this._redis));	
    }
});

exports.Proxy = proxy.Proxy;

var printExec = function (err, replies) {
    log('exec err = ', err);
    if (replies) {
	replies.forEach(function (reply, idx) {
	    log('reply ', idx, ' is ', reply);
	});
    }
}
