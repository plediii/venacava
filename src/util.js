"use strict";
var crypto = require('crypto')
;


var random_string = exports.random_string = function () {
    return crypto.randomBytes(12).toString('hex');
};
