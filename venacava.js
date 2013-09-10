
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

var printExec = function (err, replies) {
    log('exec err = ', err);
    if (replies) {
	replies.forEach(function (reply, idx) {
	    log('reply ', idx, ' is ', reply);
	});
    }
}
