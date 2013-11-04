

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

	    var ServiceInstance = _service._ServiceInstance = function (id, socket, model) {
		var _this = this;
		_this.id = id;
		_this.socket = socket;
		_this.model = model;
		_this.channel = _service.name + '/' + id;
		_this._subscriber = function () {
		    _this.emitMethod('subscribe');
		}
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
				     });
				     break;
				 case 'push':
				     _model.push(msg.body);
				     break;
				 case 'trigger':
				     _model.trigger(msg.trigger, msg.data);
				     break;
				 default:
				     console.log('dropped message ', msg);
				 }
			     }
			     ;
			     _instance.socket.on(_instance.channel, listener);
			     _instance._subscriber();
			     _instance.socket.on('reconnect', _instance._subscriber);
			 }
			 , unsubscribe: function () {
			     var _instance = this;
			     _instance.socket.removeListener(_instance.channel, _instance._listener);
			     _instance.socket.removeListener('reconnect', _instance._subscriber);
			     _instance.emitMethod('unsubscribe');
			 }
			 , emitMethod: function (funcName, data) {
			     var _instance = this
			     ;
			     _instance.socket.emit(_service.name, {
				 id: _instance.id
				 , method: funcName
				 , data: data
			     });
			 }
		     }
		     , _.object(_.map(options.methods, function (funcName) {
			 return [funcName, function (data) {
			     this.emitMethod(funcName, data);
			 }];
		     })));
	}

	_.extend(_client.Service.prototype, {
	    get: function  (id) {
		var _service = this;
		return _service._cache[id] 
		    || (_service._cache[id] = new _service._ServiceInstance(id, _service.socket, new _service.Model()));
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