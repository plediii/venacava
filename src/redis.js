/*jslint node: true */
"use strict";
var redis = require('redis')
;

var redisClient = function (args) {
    return redis.createClient.apply(redis, args);
};
