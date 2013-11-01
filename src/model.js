
var _ = require('underscore')
, Core = require(__dirname + '/core').Core
, random_string = require(__dirname + '/util').random_string
;

var Model = exports.Model = function (name, options) {
    var _this = this
    , Klass = function (channel, id, core) {
	this.id = id;
	this.channel = channel;
	this.core = core;
    }
    ;
    _this.name = name;

    options = _.defaults({}, options, {
	methods: {}
	, initialize: function () {}
	, defaults: {}
	, Core: Core
    });
    _.extend(Klass.prototype, options.methods);
    _.extend(_this, options, {
	Klass: Klass
    });
};

var getChannel = function (name, id) {
    return name + '/' + id;
};

var initialize = function (instance, initializer, attrs, options) {
    instance.core.set(attrs);
    // instance.core.set({id: instance.id})
    initializer.call(instance);
    return instance;
};

_.extend(Model.prototype, {
    create: function (attrs, options) {
	var _this = this
	, id = random_string()
	;
	attrs = _.defaults({}, attrs, _this.defaults);

	return initialize(_this.get(id, attrs, options)
		   , _this.initialize, attrs, options)
    }
    , get: function (id, attrs, options) {
	var _this = this
	, channel = getChannel(_this.name, id)
	;
	return new _this.Klass(channel, id, new _this.Core(channel, attrs, options));
    }
    , _getChannel: function (id) {
	var _this = this;
	return getChannel(_this.name, id);
    }
    , createIfNotExists: function (id, attrs, options, cb) {
	var _this = this
	, instance = _this.get(id, attrs, options);
	;
	if (_.isFunction(options)) {
	    cb = options;
	    options = void 0;
	}
	else if (_.isFunction(attrs)) {
	    cb = attrs;
	    attrs = options = void 0;
	}

	instance.core.exists(function (err, exists) {
	    if (_.isFunction(cb)) {
		if (err) {
		    return cb(err);
		}
		else {
		    if (!exists) {
			return cb(null, initialize(instance, _this.initialize, attrs, options));
		    }
		    else {
			return cb(null, instance);
		    }
		}
	    }
	    else {
		if (err) {
		    throw err;
		}
		if (!exists) {
		    initialize(instance, _this.initialize, attrs, options);
		}
	    }
	});
	return instance;
    }
});