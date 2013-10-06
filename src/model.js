
var _ = require('underscore')
, Core = require(__dirname + '/core').Core
, random_string = require(__dirname + '/util').random_string
;

var Model = exports.Model = function (options) {
    var _this = this
    , Klass = function (core) {
	this.core = core;
    }
    ;

    options = _.defaults({}, options, {
	methods: {}
	, initialize: function () {}
	, defaults: {}
	, channelRoot: ''
    });
    _.extend(Klass.prototype, options.methods);
    _.extend(_this, options, {
	Klass: Klass
    });
};

_.extend(Model.prototype, {
    create: function (attrs) {
	var _this = this
	;
	attrs = _.defaults({}, attrs, _this.defaults);
	var instance = _this.get(_this.channelRoot + random_string());
	instance.core.set(attrs);
	_this.initialize.call(instance);
	return instance;	
    }
    , get: function (channel) {
	var _this = this;
	return new _this.Klass(new Core(channel));	
    }
});