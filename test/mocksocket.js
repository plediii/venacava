
var _ = require('underscore') 
, EventEmitter = require('events').EventEmitter
;

var MockSocket = exports.MockSocket = function () {
    EventEmitter.call(this);
};

_.extend(MockSocket.prototype, {
    _receive: function () {
	this.emit.apply(this, arguments);
    }
    , _emit: function () {
	this.on.apply(this, arguments);
    }
}
, EventEmitter.prototype);

