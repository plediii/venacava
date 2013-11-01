
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

    var newService = function (name, options) {
	var service = new Service(name, options);
	return service;
    }
    , newSystem = function (methods) {
	var systemName = randomId();
	var Klass = function (id) {
	    this.id = id;
	    this.channel = systemName + '/' + id;
	};
	_.extend(Klass.prototype, methods);

	return {
	    get: function (id) {
		return new Klass(id);
	    }
	}
    }
    ;

    it('should be constructable', function () {
	assert(newService('test', {
	    system: newSystem({})
	}), 'unable to create a new service.');
    });

    describe('#serve', function () {
	it('should exist', function () {
	    var service = newService('test', {
		system: newSystem({})
	    });
	    assert(service.serve);
	});

	it('should serve sockets', function () {

	    var called = 0
	    , service = newService('test', {
		system: newSystem({
		})
		, methods: {
		    method: function (data) {
			called = called + 1;
			assert.equal(this.socket, socket, 'service instance did not have socket');
			assert.equal(this.session, session, 'service instance did not have session');
			assert.equal(data.x, 1, 'service method was not called with expected argument');
			assert(this.system, 'service method was called without system instance');
			assert.equal(this.system.id, 'x', 'service was called with system without the expected id');
		    }
		    , otherMethod: function () {
			assert(false, 'otherMethod was called')
		    }
		}
	    })
	    , socket = new MockSocket()
	    , session = {
		y: 2
	    }
	    ;
	    
	    service.serve(socket, session);
	    socket._receive('nottest', {
		id: 'x'
		, method: 'method'
		, data: {
		    x: 1
		}
	    });
	    assert.equal(0, called);
	    socket._receive('test', {
		id: 'x'
		, method: 'method'
		, data: {
		    x: 1
		}
	    });
	    assert.equal(called, 1);

	});
    });

});
