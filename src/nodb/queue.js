 /*jslint node: true */
"use strict";
var _ = require('underscore')
;


var queues = {};

var enqueue = function (name, x) {
    if (queues.hasOwnProperty(name)) {
        queues[name].push(x);
    }
    else {
        queues[name] = [x];
    }
};

var next = function (name) {
    if (queues.hasOwnProperty(name)) {
        return queues[name].shift();
    }
};

_.extend(exports, {
    queue: function (name) {
        return {
            enqueue: function (x, cb) {
                enqueue(name, x);
                if (_.isFunction(cb)) {
                    cb(null);
                }
            }
            , next: function (cb) {
                cb(null, next(name));
            }
            , del: function (cb) {
                delete queues[name];
                if (_.isFunction(cb)) {
                    cb(null);
                }
            }
            , name: function () {
                return name;
            }
        };
    }
});
