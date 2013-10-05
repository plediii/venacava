
var _ = require('underscore')
, EventEmitter = require('events').EventEmitter
, crypto = require('crypto')
, proxy = require(__dirname + '/src/proxy')
, callbackHandler = require(__dirname + '/src/callbackHandler')
, core = require(__dirname + '/src/core')
;
// model proxy enqeues prototype functions to be called.  if there is nothing on the target queue, it will start invoking the prototype functions

var log = console.log;

exports.CallbackHandler = callbackHandler.CallbackHandler;

var random_string = exports.random_string = function () {
    return crypto.randomBytes(12).toString('hex');
};

var redisClient = function (args) {
    return redis.createClient.apply(redis, redisArgs);
};


exports.Core = core.Core;

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
