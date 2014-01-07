
var _ = require('underscore') 
, EventEmitter = require('events').EventEmitter
;

var MockSocket = exports.MockSocket = function (options) {
    this._local = new EventEmitter();
    this._remote = new EventEmitter();
    this.socket = _.extend({
        connected: true
    }, options);
};

_.extend(MockSocket.prototype, {
    emit: function () {
        this._remote.emit.apply(this._remote, arguments);
    }
    , on: function () {
        this._local.on.apply(this._local, arguments);
    }
    , removeListener: function () {
        this._local.removeListener.apply(this._local, arguments);
    }
    , _receive: function () {
        this._local.emit.apply(this._local, arguments);
    }
    , _emit: function () {
        this._remote.on.apply(this._remote, arguments);
    }
});

