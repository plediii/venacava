/*jslint node: true */
"use strict";
var _ = require('underscore');

var Relay = exports.Relay = function (socket, remitter) {
    var _this = this;
    _this.socket = socket;
    _this._remitter = remitter;
    _this._relayer = function (msg) {
        socket.emit.apply(socket, msg);
    }; 
    var subscriptions = _this._subscriptions = {};

    socket.on('disconnect', function () {
        _.each(subscriptions, function (val, channel) {
            _this.unsubscribe(channel);
        });
    });
};

_.extend(Relay.prototype, {
    subscribe: function (channel) {
        var _this = this;
        if (!_this._subscriptions[channel]) {
            _this._remitter.subscribe(channel, _this._relayer);
            _this._subscriptions[channel] = true;
        }
    }
    , unsubscribe: function (channel) {
        var _this = this;
        _this._remitter.unsubscribe(channel, _this._relayer);
        delete _this._subscriptions[channel];
    }
});
