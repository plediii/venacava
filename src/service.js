
var _ = require('underscore');


var Service = exports.Service = function (options) {
    this._system = options.system;
    this._methods = options.methods;
    this.name = options.system.name;

    var ServiceInstance = this.ServiceInstance = function (system, socket, session) {
        this.system = system;
        this.socket = socket;
        this.session = session;
    };

    _.extend(ServiceInstance.prototype, options.methods, {
        trigger: function (name, data) {
            var _this = this;
            this.socket.emit(_this.system.channel, {
                subject: 'trigger'
                , trigger: name
                , data: data
            });
        }
    });

    if (options.disconnect) {
        this._disconnect = options.disconnect;
    }
    else {
        this._disconnect = function () {};
    }
};

_.extend(Service.prototype, {
    serve: function (socket, session) {
        var _service = this
        , name = _service._system.name
        ;
        socket.on(name, function (msg) {
            if (_service._methods.hasOwnProperty(msg.method)) {
                var instance = new _service.ServiceInstance(_service._system.get(msg.id), socket, session);
                instance[msg.method](msg.data);
            }
            else if (msg.check) {
                socket.emit(name);
            }
            else {
                console.log('ignored service call ', msg);
            }
        });

        socket.on('disconnect', function () {
            _service._disconnect(session);
        });

        socket.emit(_service._system.name);
    }
});