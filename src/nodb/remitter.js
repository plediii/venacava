 /*jslint node: true */
"use strict";
var _ = require('underscore')
, EventEmitter = require('events').EventEmitter
;
 
var emitters = {};

_.extend(exports, {
    remitter: {
        publish: function (channel) {
            if (emitters.hasOwnProperty(channel)) {
                emitters[channel].emit('message', _.toArray(arguments));
            }
        }
        , subscribe: function (channel, listener) {
            if (!emitters.hasOwnProperty(channel)) {
                emitters[channel] = new EventEmitter();
            }
            emitters[channel].on('message', listener);
        }
        , unsubscribe: function (channel, listener) {
            if (emitters.hasOwnProperty(channel)) {
                var emitter = emitters[channel];
                emitters[channel].removeListener('message', listener);
                if (emitter.listeners('message') === []) {
                    delete emitters[channel];
                }
            }
            
        }
    }
});
