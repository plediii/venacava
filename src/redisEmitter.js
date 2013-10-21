
var _ = require('underscore')
, EventEmitter = require('events').EventEmitter
;


var RedisEmitter = exports.RedisEmitter = function(redisSub) {
    this._redisSub = redisSub;
    var emitter = this._emitter = new EventEmitter();
    redisSub.on('message', function (channel) {
	var args = [channel].concat(_.map(_.toArray(arguments).slice(1), JSON.parse));
	emitter.emit(channel, args);
    });
};

_.extend(RedisEmitter.prototype, {
    subscribe: function (channel, listener) {
	var _this = this
	, emitter = _this._emitter;
	;
	emitter.on(channel, listener);
	if (_this._numListeners(channel) === 1) {
	    _this._redisSub.subscribe(channel);
	}

    }
    , unsubscribe: function (channel, listener) {
	var _this = this
	, emitter = _this._emitter
	;
	emitter.removeListener(channel, listener);
	if (_this._numListeners(channel) < 1) {
	    _this._redisSub.unsubscribe(channel);
	}
    }
    , _numListeners: function (channel) {
	return this._emitter.listeners(channel).length;
    }
})