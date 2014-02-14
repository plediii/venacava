/*jslint node: true */
"use strict";
var _ = require('underscore')
, EventEmitter = require('events').EventEmitter
, random_string = require(__dirname + '/../util').random_string
;

var callbackChannel = function (zip) {
    return 'callback' + zip;
};

var defaultBackend = new EventEmitter();

var CallbackHandler = function (zip, backend) {
    var _this = this;
    _this.emitter = new EventEmitter();
    _this.backend = backend || defaultBackend;
    _this.zip = zip || random_string();
    _this.nextHandle = (function () {
        var next = 0;
        return function () {
            next = next + 1;
            return {
                zip: _this.zip
                , id: next
            };
        };
    })();
    
    _this.channel = callbackChannel(_this.zip);

    _this.backend.on('message', function (channel, msg) {
        if (channel === _this.channel) {
            _this.executeLocal(msg.handle, msg.args);
        }
    });
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
        this.emitter.emit(handle.id, args);
    }
    , executeRemote: function (handle, args) {
        this.backend.emit('message', callbackChannel(handle.zip), {
            handle: handle
            , args: args
        });
    }
    , executeCallback: function (jsonHandle, args) {
        var _this = this
        , handle = JSON.parse(jsonHandle)
        ;
        if (_this.zip === handle.zip) {
            _this.executeLocal(handle, args);
        }
        else {
            _this.executeRemote(handle, args);
        }
    }
});


CallbackHandler.default = new CallbackHandler(random_string());

_.extend(exports, {
    CallbackHandler: CallbackHandler
});

