
var redis = require('redis')
;

exports.create = function (args) {
    return redis.createClient.apply(redis, args);
};
