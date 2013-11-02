
var _ = require('underscore')
, crypto = require('crypto')
;

var Core = exports.Core = function (channel, options) {
    this.channel = channel;
    this.redis = (options && options.redis) || Core.redis;
};

Core.redis = require('../src/redisClient').default;

_.each(['exists', 'erase'], function (funcName) {
    Core[funcName] = function (channel) {
	var core = new Core(channel);
	return core[funcName].apply(core, _.toArray(arguments).slice(1));
    }
});

var logError = function (message) {
    return function (err) {
	if (err) {
	    log(message, err);
	}
    };
};

_.extend(Core.prototype, {
    exists: function (cb) {
	var _this = this
	;
	_this.redis.exists(_this.channel, cb);
    }
    , erase: function (cb) {
	var _this = this
	, channel = _this.channel
	;
	cb = cb || logError('error erasing ' + channel);
	_this.redis.del(channel, function (err) {
	    if (err) {
		return cb(err);
	    }
	    else {
		_this.emit('erased');
		return cb(null);
	    }
	});
    }
    , emit: function (subject, body) {
	var _this = this;
	_this.redis.publish(_this.channel, JSON.stringify({
	    subject: subject
	    , body: body
	}));
    }
});