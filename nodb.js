 /*jslint node: true */
"use strict";
var _ = require('underscore')
;

_.extend(exports, {
    Lock: require(__dirname + '/src/nodb/lock')
    , CallbackHandler: require(__dirname + '/src/nodb/callbackHandler').CallbackHandler
    , queue: require(__dirname + '/src/nodb/queue').queue
    , remitter: require(__dirname + '/src/nodb/remitter').remitter
});
