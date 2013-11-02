
var _ = require('underscore')
, DefaultCore = require(__dirname + '/hash-core').HashCore
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
	, Core: DefaultCore
    });
    _.extend(Klass.prototype, options.methods);
    _.extend(_this, options, {
	Klass: Klass
    });
};

var getChannel = function (name, id) {
    return name + '/' + id;
};

_.extend(Model.prototype, {
    create: function (attrs, options) {
	var _this = this
	, id = random_string()
	;
	return _this._initialize(_this.get(id), attrs, options);
    }
    , _initialize: function (instance, attrs, options) {
	var _this = this;
	instance.core.set(_.defaults({}, attrs, _this.defaults));
	_this.initialize.call(instance);
	return instance;
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
			return cb(null, _this._initialize(instance, attrs, options));
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