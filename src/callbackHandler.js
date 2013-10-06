
var _ = require('underscore')
, EventEmitter = require('events').EventEmitter
, redisClient = require(__dirname + '/redisClient')
, random_string = require(__dirname + '/util').random_string
;

var callbackChannel = function (zip) {
    return 'callback' + zip;
};


var CallbackHandler = exports.CallbackHandler = function (zip) {
    var _this = this;
    _this.zip = zip;
    _this.redissub = CallbackHandler._redissub
    _this.redispub = CallbackHandler._redispub
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

CallbackHandler._redissub = redisClient.create();
CallbackHandler._redispub = redisClient.default;

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

exports.default = new CallbackHandler(random_string());