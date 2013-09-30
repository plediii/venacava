
var _ = require('underscore') 
, EventEmitter = require('events').EventEmitter
;

var MockSocket = exports.MockSocket = function () {
    EventEmitter.call(this);
};

_.extend(MockSocket.prototype, {

}
, EventEmitter);

