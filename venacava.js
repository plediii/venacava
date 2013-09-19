
var _ = require('underscore')
, EventEmitter = require('events').EventEmitter
, crypto = require('crypto')
;
// model proxy enqeues prototype functions to be called.  if there is nothing on the target queue, it will start invoking the prototype functions

var log = console.log;

var ModelProxy = exports.ModelProxy = function (hub, channel, Model) {
    this.hub = hub;
    this.channel = channel;
    this.Model = Model;
    this.queue = 'queue:' + channel;
    this.lock = 'instancelock:' + channel;
};

var popTask = function (model) {
    // @ = ModelProxy
    var _this = this; 
    _this.redis.lpop(_this.queue, function (err, jsonTask) {
	if (err) {
	    log('error popping task from queue', err);
	    return;
	}
	else {
	    if (jsonTask) {
		var task = JSON.parse(jsonTask)
		, method = task[0]
		, args = task.slice(1, task.length - 1)
		, cbHandle = _.last(task)
		;
		model[method].apply(model, args.concat([function () {  
		    _this.hub.callbackHandler.executeCallback(cbHandle, _.toArray(arguments));
		    popTask.call(_this, model);
		}]));
	    }
	    else {
		_this.release();
	    }
	}
    });
};

_.extend(ModelProxy.prototype, {
    processQueue: function () {
	var _this = this
	, redis = _this.redis
	, channel = _this.channel
	;
	return redis.setnx(_this.lock, 1, function (err, locked) {
	    if (err) {
		log('error locking core ', channel, err);
		return;
	    }
	    else if (locked !== 0) {
		return _this.hub.fetchCore(channel, function (err, core) {
		    if (err) {
			log('error fetching core ', err);
			return;
		    }
		    else {
			return popTask.apply(_this, new Model(core));
		    }
		});
	    }
	    else {
		log('error locking core, lock = ', locked);
		return;
	    }
	});
    }
    , enqueue: function (args) {
	var _this = this;

	_this.hub.redis
	    .multi()
	    .get(_this.lock)
	    .llen(_this.queue)
	    .rpush(_this.queue, JSON.stringify(args))
	    .exec(function (err, replies) {
		if (err) {
		    log('error enquing task', err);
		}
		else {
		    (function (locked, len) {
			if (!locked && len === 0) {
			    _this.processQueue();
			}
		    }).apply(_this, replies)
		}
	    });
    }
    , invoke: function (method /* args, ..., cb */) {
	var _this = this
	, proto = _this.proto
	, args = _.toArray(arguments)
	, cb = _.last(args)
	; 

	if (_.has(proto, method) && _.isFunction(proto[method])) {
	    // hook into the local emitter to get the callback
	    _this.enqueue(_.initial(args).concat([_this.hub.callbackHandler.handleCallback(cb)]));
	}
    }
});

var callbackChannel = function (zip) {
    return 'callback' + zip;
};

var CallbackHandler = exports.CallbackHandler = function (zip, redissub, redispub) {
    var _this = this;
    _this.zip = zip;
    _this.redissub = redissub;
    _this.redispub = redispub;
    _this.emitter = new EventEmitter();
    _this.nextHandle = (function () {
	var next = 0;
	return function () {
	    next = next + 1;
	    return {
		zip: _this.zip
		, id: next
	    }
	};
    })();

    _this.redissub.on('message', function (channel, JSONmsg) {
	var msg = JSON.parse(JSONmsg);
	_this.executeLocal(msg.handle, msg.args);
    });

    _this.redissub.subscribe(callbackChannel(zip));
};

_.extend(CallbackHandler.prototype, {
    handleCallback: function (func, context) {
	var _this = this
	, handle = this.nextHandle()
	;
	_this.emitter.once(handle.id, function (args) {
	    func.apply(context, args);
	});
	return JSON.stringify(handle);
    }
    , executeLocal: function (handle, args) {
	this.emitter.emit(handle.id, args)
    }
    , executeRemote: function (handle, args) {
	this.redispub.publish(callbackChannel(handle.zip), JSON.stringify({
	    handle: handle
	    , args: args
	}));
    }
    , executeCallback: function (jsonHandle, args) {
	var _this = this
	, handle = JSON.parse(jsonHandle)
	if (_this.zip === handle.zip) {
	    _this.executeLocal(handle, args);
	}
	else {
	    _this.executeRemote(handle, args);
	}
    }
});


var random_string = exports.random_string = function () {
    return crypto.randomBytes(12).toString('hex');
};

var redisClient = function (args) {
    return redis.createClient.apply(redis, redisArgs);
};

var Hub = function (redisArgs) {
    var _this = this
    , backend = _this.backend = redisClient(redisArgs)
    ;
    _this.emitter = new EventEmitter();
    var zip = _this.zip = random_string();
    _this.callbackHandler = new CallbackHandler(zip, redisClient(redisArgs), backend);
};

_.extend(Hub, {
});

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
	_redis.hmset(channel, attrs, function (err) {
	    if (err) {
		if (cb) {
		    cb(err);
		}
	    }
	    else {
		_this._redis.publish(_this.channel, JSON.stringify({
		    subject: 'set'
		    , body: attrs
		}));
		if (cb) {
		    return cb(null);
		}
	    }
	});
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

var ProxyQueue = function (channel, redis, cbHandler, model) {
    var _this = this
    ;
    _this.channel = channel;
    _this.redis = redis;
    _this.cbHandler = cbHandler;
    _this.model = model;
    _this.queue = 'queue:' + channel;
    _this.lock = 'lock:' + channel;
    _this.defaultCb = function (err) {
	if (err) {
	    log('uncaught error when invoking ', channel, err);
	}
    }
    _this.instance = null;
};

_.extend(ProxyQueue.prototype, {
    enqueue: function (method, args) {
	var _this = this
	;
	args = _.clone(args);

	var argCb = void 0
	;
	if (_.isFunction(_.last(args))) {
	    argCb = args.pop();
	}
	else {
	    argCb = _this.defaultCb;
	}

	args.push(_this.cbHandler.handleCallback(argCb));

	return _this.redis.multi() 
	    .get(_this.lock)
	    .rpush(_this.queue, JSON.stringify([method, args]))
	    .exec(function (err, replies) {
		if (err) {
		    return log('error enquing proxy task to channel ', _this.channel, err);
		}
		else {
		    var locked = replies[0];
		    if (!locked) {
			return _this.process();
		    }
		}
	    });
    }
    , process: function () {
	var _this = this
	, queue = _this.queue
	;
	_this.redis.setnx(_this.lock, 1, function (err, locked) {
	    if (err) {
		log('error setting lock for ', _this.lock, err);
		return;
	    }
	    else if (locked !== 0) {
		_this.instance = _this.model.get(_this.channel);
		_this.instance.core.fetch(function (err) {
		    if (err) {
			log('error fetching model for ', _this.channel, err);
		    }
		    else {
			_this.execute();
		    }
		});
	    }
	});
    }
    , execute: function () {
	var _this = this
	, queue = _this.queue
	;
	return _this.redis.multi()
	    .lpop(queue)
	    .llen(queue)
	    .exec(function (err, replies) {
		if (err) {
		    log('error executing task from ', queue, err);
		    return _this.release();
		}

		(function (JSONTask, llen) {
		    var task = JSON.parse(JSONTask)
		    , method = task[0]
		    , args = task[1]
		    , cbHandle = args.pop()
		    , instance = _this.instance
		    , next = llen > 0 ? _this.execute : _this.release
		    ;
		    args.push(function () {
			_this.cbHandler.executeCallback(cbHandle, _.toArray(arguments));
			next.call(_this);
		    });
		    instance[method].apply(instance, args);
		}).apply(_this, replies)
	    });
    }
    , release: function () {
	var _this = this
	, queue = _this.queue
	, lock = _this.lock
	;
	_this.instance = null;
	return _this.redis.multi()
	    .del(lock)
	    .llen(queue)
	    .exec(function (err, replies) {
		if (err) {
		    log('error releasing queue ', queue, err);
		    return;
		}
		else {
		    var llen = replies[1];
		    if (llen > 0) {
			return _this.process();
		    }
		    else {
			return;
		    }
		}
	    });
    }
});

var Proxy = exports.Proxy = function (redis, cbHandler, model) {
    var _this = this
    ;
    _this.cbHandler = cbHandler;
    _this.model = model;
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
	
	return new _this.Klass(instance.core.channel);
    }
    , get: function (channel) {
	var _this = this;
	return new _this.Klass(channel);
    }
});

var printExec = function (err, replies) {
    log('exec err = ', err);
    if (replies) {
	replies.forEach(function (reply, idx) {
	    log('reply ', idx, ' is ', reply);
	});
    }
}
