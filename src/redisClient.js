
var redis = require('redis')
;

var create = exports.create = function (args) {
    return redis.createClient.apply(redis, args);
};


exports.default = create();