
var _ = require('underscore')
, EventEmitter = require('events').EventEmitter
;

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