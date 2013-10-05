
var _ = require('underscore')
, crypto = require('crypto')
, Core = require(__dirname + '/core').Core
;

var random_string = exports.random_string = function () {
    return crypto.randomBytes(12).toString('hex');
};

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