
var _ = require('underscore');


var Service = exports.Service = function (name, options) {
    this._system = options.system;
    this._methods = options.methods;
    this.name = name;

    var ServiceInstance = this.ServiceInstance = function (system, socket, session) {
	this.system = system;
	this.socket = socket;
	this.session = session;
    };

    _.extend(ServiceInstance.prototype, {

    }, options.methods);
};

_.extend(Service.prototype, {
    serve: function (socket, session) {
	var _service = this;
	socket.on(_service.name, function (msg) {
	    if (_service._methods.hasOwnProperty(msg.method)) {
		var instance = new _service.ServiceInstance(_service._system.get(msg.channel), socket, session);
		instance[msg.method](msg.data);
	    }
	});
    }
});