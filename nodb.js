 /*jslint node: true */
"use strict";
var _ = require('underscore')
;

_.extend(exports, {
    Lock: require(__dirname + '/src/nodb/lock')
});
