
var _ = require('underscore')
, redisClient = require(__dirname + '/redisClient')
, callbackHandler = require(__dirname + '/callbackHandler')
;


var ProxyQueue = function (channel, redis, cbHandler, model) {
    var _this = this
    ;
    _this.channel = channel;
    _this._redis = redis;
    _this._cbHandler = cbHandler;
    _this._model = model;
    _this._local = [];
    _this._instance = null;
    _this._lock = 'lock:' + channel;
    _this._queue = 'queue:' + channel;
};

_.extend(ProxyQueue.prototype, {
    enqueue: function (method, args) {
	var _this = this
	;

	_this._local.push([method, args]);
	if (_this._instance) {
	    return _this;
	}
	_this._instance = _this._model.get(_this.channel);
	_this.lock();
    }
    , lock: function () {
	var _this = this;
	_this._redis.setnx(_this._lock, 1, function (err, locked) {
	    if (err) {
		log('error setting lock for ', _this.lock, err);
	    }
	    else {
		if (locked === 1) {
		    _this.acquired();
		}
		else {
		    _this._redis.multi()
			.rpush(_this._queue, _this._cbHandler.handleCallback(_this.acquired, _this))
			.setnx(_this._lock, 1)
			.exec(function (err, replies) {
			    if (err) {
				log('error enqueuing lock', _this._queue, err);
			    }
			    else {
				var locked = replies[1];
				if (locked === 1) {
				    return _this.nextLock();
				}
			    }
			});
		}
	    }
	});
    }
    , nextLock: function () {
	var _this = this;
	_this._redis.lpop(_this._queue, function (err, nextHandle) {
	    if (err || !nextHandle) {
		_this._redis.del(_this._lock);
		if (err) {
		    log('error popping next handle', _this._queue, err);
		}
	    }
	    else {
		_this._cbHandler.executeCallback(nextHandle);
	    }
	});
    }
    , acquired: function () {
	var _this = this;
	_this._instance.core.fetch(function (err) {
	    if (err) {
		log('error fetching core ', _this._instance.core.channel, err);
		return;
	    }
	    else {
		_this.process();
	    }	    
	});
    }
    , process: function () {
	var _this = this
	, local = _this._local
	;
	if (local.length === 0) {
	    _this._instance = null;
	    return _this.nextLock();
	}
	else {
	    var task = _.first(local)
	    , method = task[0]
	    , args = task[1]
	    , argCb = _.last(args)
	    ;
	    _this._local = _.rest(local);
	    
	    if (_.isFunction(argCb)) {
		args.pop();
	    }
	    else {
		argCb = function (err) {
		    if (err) {
			log('uncaught error ', _this.queue, err);
		    }
		}
	    }
	    args.push(function () {
		argCb.apply(null, arguments);
		_this.process();
	    });

	    _this._instance[method].apply(_this._instance, args);
	}
    }
});

var Proxy = exports.Proxy = function (options) {
    var _this = this
    , model = _this.model = options.model
    , cbHandler = _this.cbHandler = options.cbHandler || Proxy.cbHandler
    , redis = (options && options.redis) || Proxy.redis
    ;
    
    
    var Klass = _this.Klass = function (channel) {
	this.channel = channel;
	this.queue = new ProxyQueue(channel, redis, cbHandler, model);
    };

    _.each(model.proto, function (func, name) {
	Klass.prototype[name] = function () {
	    this.queue.enqueue(name, _.toArray(arguments));
	};
    });
};

_.extend(Proxy.prototype, {
    create: function (attrs) {
	var _this = this
	, model = _this.model
	, instance = model.create(attrs)
	;
	return _this.get(instance.core.channel);
    }
    , get: function (channel) {
	var _this = this;
	return new _this.Klass(channel);
    }
});

Proxy.cbHandler = callbackHandler.default;
Proxy.redis = redisClient.default;