
var _ = require('underscore')
, redisClient = require(__dirname + '/redisClient')
, callbackHandler = require(__dirname + '/callbackHandler')
, EventEmitter = require('events').EventEmitter
;


var ProxyQueue = function (id, redis, cbHandler, model, methods) {
    var _this = this
    , channel = model._getChannel(id)
    ;
    _this.id = id;
    _this.channel = channel;
    _this._redis = redis;
    _this._cbHandler = cbHandler;
    _this._model = model;
    _this._local = [];
    _this._instance = null;
    _this._lock = 'lock:' + channel;
    _this._queue = 'queue:' + channel;
    _this._methods = methods;
    _this.emitter = new EventEmitter();
};

_.extend(ProxyQueue.prototype, {
    enqueue: function (method, args) {
        var _this = this
        ;

        _this._local.push([method, args]);
        if (_this._instance) {
            return _this;
        }
        var model = _this._model.get(_this.id);
        _this._instance = _.extend({
            model: model
            , core: model.core
        }, _this._methods);
        _this.lock();
    }
    , lock: function () {
        var _this = this
        ;
        _this._redis.setnx(_this._lock, 1, function (err, locked) {
            if (err) {
                log('error setting lock for ', _this.lock, err);
            }
            else {
                if (locked === 1) {
                    _this._redis.expire(_this._lock, 5);
                    _this._redis.expire(_this._queue, 5);
                    _this.acquired();
                }
                else {
                    _this._redis.multi()
                        .rpush(_this._queue, _this._cbHandler.handleCallback(_this.acquired, _this))
                        .setnx(_this._lock, 1)
                        .exec(function (err, replies) {
                            if (err) {
                                log('error enqueuing lock', _this._queue, err);
                            }
                            else {
                                var locked = replies[1];
                                if (locked === 1) {
                                    return _this.nextLock();
                                }
                            }
                        });
                }
            }
        });
    }
    , nextLock: function () {
        var _this = this;
        _this._redis.lpop(_this._queue, function (err, nextHandle) {
            if (err || !nextHandle) {
                _this._redis.del(_this._lock);
                if (err) {
                    log('error popping next handle', _this._queue, err);
                }
            }
            else {
                _this._cbHandler.executeCallback(nextHandle);
            }
        });
    }
    , acquired: function () {
        var _this = this;
        _this._instance.core.fetch(function (err) {
            if (err) {
                log('error fetching core ', _this._instance.core.channel, err);
                return;
            }
            else {
                _this.process();
            }       
        });
    }
    , process: function () {
        var _this = this
        , local = _this._local
        ;
        if (local.length === 0) {
            _this._instance = null;
            _this.emitter.emit('release');
            return _this.nextLock();
        }
        else {
            var task = _.first(local)
            , method = task[0]
            , args = task[1]
            , argCb = _.last(args)
            ;
            _this._local = _.rest(local);
            
            if (_.isFunction(argCb)) {
                args.pop();
            }
            else {
                argCb = function (err) {
                    if (err) {
                        log('uncaught error ', _this.queue, err);
                    }
                };
            }
            args.push(function () {
                argCb.apply(null, arguments);
                _this.process();
            });

            _this._instance[method].apply(_this._instance, args);
        }
    }
});

var Proxy = exports.Proxy = function (options) {
    var _this = this
    , model = _this.model = options.model
    , cbHandler = _this.cbHandler = options.cbHandler || Proxy.cbHandler
    , redis = _this._redis = (options && options.redis) || Proxy.redis
    , methods = _this._methods = options.methods
    , qcache  = {}
    ;

    _this.name = model.name;

    
    var Klass = _this.Klass = function (id) {
        this.id = id;
        this.channel = model._getChannel(id);
    };

    _.each(methods, function (func, name) {
        Klass.prototype[name] = function () {
            if (!qcache.hasOwnProperty(this.channel)) {
                var q = qcache[this.channel] = new ProxyQueue(this.id, _this._redis, _this.cbHandler, _this.model, _this._methods);
                q.emitter.on('release', function () {
                    delete qcache[this.channel];
                });
            }
            qcache[this.channel].enqueue(name, _.toArray(arguments));
        };
    });
};

_.extend(Proxy.prototype, {
    create: function (attrs) {
        var _this = this
        , model = _this.model
        , instance = model.create(attrs)
        ;
        return _this.get(instance.id);
    }
    , get: function (id) {
        var _this = this;
        return new _this.Klass(id);
    }
});

Proxy.cbHandler = callbackHandler.default;
Proxy.redis = redisClient.default;
