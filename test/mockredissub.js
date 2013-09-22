
var _ = require('underscore')
;

var MockRedisSub = exports.MockRedisSub = function () {
    this.subscriptions = {};
    this.messageListeners = [];
    this.subscriptionListeners = [];
};

_.extend(MockRedisSub.prototype, {
    subscribe: function (channel) {
	var _this = this;
	_this.subscriptions[channel] = 1 + (_this.subscriptions[channel] || 0);
	_.each(_this.subscribeListeners, function (listener) {
	    listener(channel, _.keys(_this.subscriptions).length);
	});
    }
    , unsubscribe: function (channel) {
	delete this.subscriptions[channel];
    }
    , on: function (type, listener) {
	if (type === 'message') {
	    this.messageListeners.push(listener);
	}
	else if (type === 'subscribe') {
	    this.subscribeListeners.push(listener);
	}
    }
    , _emit: function (channel, message) {
	if (this.subscriptions[channel] > 0) {
	    _.each(this.messageListeners, function (listener) {
		listener(channel, message);
	    });
	}
    }
});
