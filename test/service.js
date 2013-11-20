
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

	it('should cause the service available to be emitted', function (done) {
	    var name = 'test'
	    , service = newService({
		system: newSystem(name)
	    }) 
	    , socket = new MockSocket()
	    ;
	    socket._emit(name, function () {
		done();
	    });
	    service.serve(socket);
	});

	it('should serve methods from sockets', function (done) {

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

	it('should send trigger events to the socket', function (done) {
	    var service = newService({
		system: newSystem('test', {})
		, methods: {
		    goTrigger: function () {
			this.trigger('triggername');
		    }
		}
	    })
	    , socket = new MockSocket()
	    ;
	    service.serve(socket, {});
	    socket._emit('test/x', function (msg) {
		assert(msg);
		assert.equal(msg.subject, 'trigger');
		assert.equal(msg.trigger, 'triggername');
		done();
	    });
	    socket._receive('test', {
		id: 'x'
		, method: 'goTrigger'
	    });
	    
	});

	it('should send trigger events with data to the socket', function (done) {
	    var service = newService({
		system: newSystem('test', {})
		, methods: {
		    goTrigger: function () {
			this.trigger('triggername', {x: 1});
		    }
		}
	    })
	    , socket = new MockSocket()
	    ;
	    service.serve(socket, {});
	    socket._emit('test/x', function (msg) {
		assert(msg);
		assert.equal(msg.subject, 'trigger');
		assert(msg.data);
		assert.equal(msg.data.x, 1);
		done();
	    });
	    socket._receive('test', {
		id: 'x'
		, method: 'goTrigger'
	    });

	});
    });

    it('should respond to service checks', function (done) {
	var service = newService({
	    system: newSystem('test', {})
	    , methods: {
	    }
	})
	, socket = new MockSocket()
	;
	service.serve(socket, {});
	socket._emit('test', function () {
	    done();
	});
	socket._receive('test', {
	    check: true
	});
    });

});
