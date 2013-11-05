
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

    var newService = function (options) {
	var service = new Service(options);
	return service;
    }
    , newSystem = function (systemName, methods) {
	var Klass = function (id) {
	    this.id = id;
	    this.channel = systemName + '/' + id;
	};
	_.extend(Klass.prototype, methods);

	return {
	    name: systemName
	    , get: function (id) {
		return new Klass(id);
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
		system: newSystem('test', {})
	    });
	    assert(service.serve);
	});

	it('should serve sockets', function (done) {

	    var called = 0
	    , service = newService({
		system: newSystem('test', {})
		, methods: {
		    method: function (data) {
			called = called + 1;
			assert.equal(this.socket, socket);
			assert.equal(this.session, session);
			assert.equal(data.x, 1);
			assert(this.system);
			assert.equal(this.system.id, 'x');
			done();
		    }
		    , otherMethod: function () {
			assert(false)
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
