
var venacava = require('../venacava.js')
, Service = venacava.Service
, assert = require('assert')
, EventEmitter = require('events').EventEmitter
, _ = require('underscore')
, MockSocket = require('./mocksocket').MockSocket
;

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};


describe('service', function () {

    var newService = function (name, system) {
	var service = new Service(name, system);
	return service;
    }
    , newSystem = function (methods) {
	var Klass = function (channel) {
	    this.channel = channel;
	};
	_.extend(Klass.prototype, methods);

	return {
	    get: function (channel) {
		return new Klass(channel);
	    }
	}
    }
    ;

    it('should be constructable', function () {
	assert(newService({
	    system: newSystem({})
	}), 'unable to create a new service.');
    });

    describe('#serve', function () {
	it('should exist', function () {
	    var service = newService({
		system: newSystem({})
	    });
	    assert(service.serve, 'proxy does not have a create property.');
	});

	it('should serve sockets', function (done) {

	    var called = false
	    , service = newService({
		system: newSystem({
		})
		, methods: {
		    method: function (data) {
			called = true;
			assert.equal(this.socket, socket, 'service instance did not have socket');
			assert.equal(this.session, session, 'service instance did not have session');
			assert.equal(data.x, 1, 'service method was not called with expected argument');
			assert(this.system, 'service method was called without system instance');
			assert.equal(this.system.channel, 'x', 'service was called with system without expected channel');
		    }
		    , otherMethod: function () {
			assert(false, 'otherMethod was not intended to be called')
		    }
		}
	    })
	    , socket = new MockSocket()
	    , session = {
		y: 2
	    }
	    ;
	    
	    service.serve('test', socket, session);
	    socket._receive('nottest', {
		channel: 'x'
		, method: 'method'
		, data: {
		    x: 1
		}
	    });
	    assert(!called, 'method was mistakenly called');
	    socket._receive('test', {
		channel: 'x'
		, method: 'method'
		, data: {
		    x: 1
		}
	    });
	    assert(called, 'method was not called');

	});
    });

});
