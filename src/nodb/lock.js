 /*jslint node: true */
"use strict";
var _ = require('underscore')
;


var locks = {};

_.extend(exports, {
    acquire: function (lockid, cb) {
        if (locks.hasOwnProperty(lockid)) {
            return cb(null, false);
        }
        else {
            locks[lockid] = 1;
            return cb(null, true);
        }
    }
    , release: function (lockid, cb) {
        delete locks[lockid];
        return cb(null);
    }
});