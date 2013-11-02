
var _ = require('underscore')
, proxy = require(__dirname + '/src/proxy')
, callbackHandler = require(__dirname + '/src/callbackHandler')
, hashcore = require(__dirname + '/src/hash-core')
, model = require(__dirname + '/src/model')
, remitter = require(__dirname + '/src/redisEmitter.js')
, relay = require(__dirname + '/src/relay.js')
, service = require(__dirname + '/src/service.js')
;
// model proxy enqeues prototype functions to be called.  if there is nothing on the target queue, it will start invoking the prototype functions

var log = console.log;

exports.CallbackHandler = callbackHandler.CallbackHandler;

exports.HashCore = hashcore.HashCore;

exports.Model = model.Model;

exports.Proxy = proxy.Proxy;

exports.redisClient = require(__dirname + '/src/redisClient');

exports.RedisEmitter = remitter.RedisEmitter;

exports.Relay = relay.Relay;

exports.Service = service.Service;

var printExec = function (err, replies) {
    log('exec err = ', err);
    if (replies) {
	replies.forEach(function (reply, idx) {
	    log('reply ', idx, ' is ', reply);
	});
    }
}
