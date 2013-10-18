

(function(){

    var root = this;

    var venaclient;
    if (typeof exports !== 'undefined') {
	venaclient = exports;
    } else {
	venaclient = root.venaclient = {};
    }

    var _ = root._;
    if (!_ && (typeof require !== 'undefined')) {
	_ = require('underscore');
    }

    var Client = venaclient.Client = function (socket) {
	var _client = this
	;

	_client.socket = socket;
	_client.Service =  function (name, Model, options) {
	    var _service = this
	    , methods
	    ;
	    _service.name = name;
	    _service.Model = Model;
	    _service.socket = _client.socket;
	    _service._cache = {};

	    options = _.defaults({}, options, {
		methods: []
	    });

	    var ServiceInstance = _service._ServiceInstance = function (channel, socket, model) {
		this.channel = channel;
		this.socket = socket;
		this.model = model;
	    };
	    _.extend(ServiceInstance.prototype
		     , {
			 subscribe: function () {
			     var _instance = this
			     , _model = _instance.model
			     , listener = _instance._listener = function (msg) {
				 switch (msg.subject) {
				 case 'set': 
				     _model.set(msg.body);
				     break;
				 case 'unset': 
				     _.each(msg.body, function (val, key) {
					 _model.unset(key);
				     })
					 break;
				 case 'trigger':
				     _model.trigger(msg.trigger, msg.data);
				     break;
				 default:
				 }
			     }
			     ;
			     _instance.socket.on(_instance.channel, listener);
			 }
			 , unsubscribe: function () {
			     var _instance = this;
			     _instance.socket.removeListener(_instance.channel, _instance._listener);
			 }
		     }
		     , _.object(_.map(options.methods, function (funcName) {
			 return [funcName, function (data) {
			     var _instance = this
			     ;
			     _instance.socket.emit(_service.name, {
				 channel: _instance.channel
				 , method: funcName
				 , data: data
			     });
			 }];
		     })));
	}

	_.extend(_client.Service.prototype, {
	    get: function  (channel) {
		var _service = this;
		return _service._cache[channel] 
		    || (_service._cache[channel] = new _service._ServiceInstance(channel, _service.socket, new _service.Model()));
	    }
	});


    };

    _.extend(Client.prototype, {
	Service: function (name, Model) {
	    this.name = name;
	    this.Model = Model;
	}
    });



}).call(this);