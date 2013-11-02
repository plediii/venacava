
var venaclient = require('../venaclient.js')
, assert = require('assert')
, EventEmitter = require('events').EventEmitter
, _ = require('underscore')
, Backbone = require('backbone')
, MockSocket = require(__dirname + '/mocksocket').MockSocket
;

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};

var newContext = function (options) {
    var name = 'test'
    , Model = Backbone.Model.extend({
	urlRoot: name
    })
    , socket = new MockSocket()
    , client = new venaclient.Client(socket)
    , name = randomId();
    ;

    return {
	Model: Model
	, name: name
	, socket: socket
	, client: client
	, service: new client.Service(name, Model, options)
    };
}
;


describe('venaclient', function () {
    
    describe('#model', function () {

	it('should be constructable', function () {
	    assert(newContext().service);
	});

	describe('#get', function () {

	    it('should exist', function () {
		assert.equal(typeof newContext().service.get, 'function');
	    });

	    it('should provide instances', function () {
		assert(newContext().service.get(randomId()))
	    });

	    it('should have the service name', function () {
		var context = newContext();
		assert.equal(context.service.name, context.name);
	    });

	    describe(':instance', function () {

		it('should have the instance id', function () {
		    var id = randomId();
		    assert.equal(newContext().service.get(id).id, id);
		});

		it('should have the instance channel', function () {
		    var id = randomId()
		    , service = newContext().service
		    assert.equal(service.get(id).channel, service.name + '/' + id);
		});


		it('should always be the same object for the same id', function () {
		    var context = newContext()
		    , id = randomId()
		    , instance = context.service.get(id)
		    , otherInstance = context.service.get(id)
		    ;
		    instance.x = 1;
		    otherInstance.x = 2;
		    assert.equal(otherInstance.x, instance.x);
		});

		describe('#socket', function () {
		    it('should exist', function () {
			var context = newContext();
			assert(_.isObject(context.service.get(randomId()).socket));
		    });

		    it('should be the service socket', function () {
			var context = newContext();
			assert.equal(context.service.get(randomId()).socket, context.socket);
		    });
		});


		describe('#model', function () {

		    it('should exist', function () {
			var context = newContext();
			assert(_.isObject(context.service.get(randomId()).model));
		    });

		    it('should be of the expected type', function () {
			var context = newContext();
			assert(context.service.get(randomId()).model instanceof context.Model);
		    });

		});

		describe('#subscribe', function () {
		    it('should exist', function () {
			var context = newContext();
			assert.equal(typeof context.service.get(randomId()).subscribe, 'function');
		    });

		    it('should emit a subscribe event on the socket', function (done) {
			var context = newContext()
			, instance = context.service.get(randomId())
			;
			context.socket._emit(context.name, function (msg) {
			    assert.equal(msg.method, 'subscribe');
			    assert.equal(msg.id, instance.id);
			    done();
			});
			instance.subscribe();
		    });

		    it('should re-emit a subscribe event when the socket reconnects', function () {
			var context = newContext()
			, instance = context.service.get(randomId())
			, called = 0
			;
			context.socket._emit(context.name, function (msg) {
			    if (msg.method === 'subscribe') {
				called = 1 + called;
			    }
			});
			instance.subscribe();
			assert.equal(1, called);
			context.socket._receive('reconnect');
			assert.equal(2, called);
		    });

		    it('should trigger "set" updates on the model', function (done) {
			var context = newContext()
			, id = randomId()
			, instance = context.service.get(id)
			;
			instance.subscribe();
			instance.model.on('change:x', function () {
			    assert.equal(instance.model.get('x'), 1);
			    done();
			});
			context.socket._receive(instance.channel, {
			    subject: 'set'
			    , body: {
				x: 1
			    }
			});
		    });

		    it('should trigger "unset" updates on the model', function (done) {
			var context = newContext()
			, id = randomId()
			, instance = context.service.get(id)
			;
			instance.subscribe();
			instance.model.set('x', 1);
			instance.model.on('change:x', function () {
			    assert(!instance.model.has('x'));
			    done();
			})
			context.socket._receive(instance.channel, {
			    subject: 'unset'
			    , body: {
				x: 1
			    }
			});
		    });  

		});

		describe('#unsubscribe', function () {
		    it('should exist', function () {
			var context = newContext();
			assert.equal(typeof context.service.get(randomId()).subscribe, 'function');
		    });

		    it('should not trigger "set" updates on the model afterward', function () {
			var context = newContext()
			, id = randomId()
			, instance = context.service.get(id)
			, called = 0
			;
			instance.subscribe();
			instance.model.on('change:x', function () {
			    called = called + 1
			});
			context.socket._receive(instance.channel, {
			    subject: 'set'
			    , body: {
				x: 1
			    }
			});
			instance.unsubscribe();
			context.socket._receive(instance.channel, {
			    subject: 'set'
			    , body: {
				x: 2
			    }
			});
			assert.equal(called, 1);
		    });

		    it('should not re-emit a subscribe event when the socket reconnects after unsubscribe', function () {
			var context = newContext()
			, instance = context.service.get(randomId())
			, called = 0
			;
			context.socket._emit(context.name, function (msg) {
			    if (msg.method === 'subscribe') {
				called = 1 + called;
			    }
			});
			instance.subscribe();
			assert.equal(1, called);
			instance.unsubscribe();
			context.socket._receive('reconnect');
			assert.equal(1, called);

		    });
		});

		describe(':methods', function () {
		    
		    it('should exist', function () {
			var context = newContext({
			    methods: ['method']
			});
			assert.equal(typeof context.service.get(randomId()).method, 'function');
		    });

		    it('should transmit the method over the socket', function (done) {
			var context = newContext({
			    methods: ['method']
			})
			, instance = context.service.get(randomId())
			;
			context.socket._emit(context.service.name, function (msg) {
			    assert(msg);
			    assert.equal(msg.id, instance.id);
			    assert.equal(msg.method, 'method');
			    assert(msg.hasOwnProperty('data'), 'service method invocation msg did not have a data property.')
			    assert.equal(msg.data.x, 1);
			    done()
			});
			instance.method({
			    x: 1
			});
		    });

		    it('should transmit "subscribe" over the socket as if it was a method', function (done) {
			var context = newContext()
			, instance = context.service.get(randomId())
			;
			context.socket._emit(context.service.name, function (msg) {
			    assert(msg);
			    assert.equal(msg.id, instance.id);
			    assert.equal(msg.method, 'subscribe');
			    done();
			});
			instance.subscribe();
		    });

		    it('should transmit "unsubscribe" over the socket as if it was a method', function (done) {
			var context = newContext()
			, instance = context.service.get(randomId())
			;
			context.socket._emit(context.service.name, function (msg) {
			    assert(msg);
			    assert.equal(msg.id, instance.id);
			    if (msg.method === 'unsubscribe') {
				return done();
			    }
			});
			instance.subscribe();
			instance.unsubscribe();
		    });


		});

		describe('#on', function () {
		    
		    it('should be triggered by socket events for the target channel', function (done) {
			var context = newContext({
			    methods: ['method']
			})
			, instance = context.service.get(randomId())
			;
			instance.subscribe();
			instance.model.on('trigger', function (data) {
			    done();
			});

			context.socket._receive(instance.channel, {
			    subject: 'trigger'
			    , trigger: 'trigger'
			});
		    });

		    it('should be triggered with data', function (done) {
			var context = newContext({
			    methods: ['method']
			})
			, instance = context.service.get(randomId())
			;
			instance.subscribe();
			instance.model.on('trigger', function (data) {
			    assert.equal(data.x, 1);
			    done();
			});

			context.socket._receive(instance.channel, {
			    subject: 'trigger'
			    , trigger: 'trigger'
			    , data: {
				x: 1
			    }
			});
		    });

		    it('should not be triggered by socket events for other channels', function () {
			var context = newContext({
			    methods: ['method']
			})
			, instance = context.service.get(randomId())
			, called = 0
			;
			instance.subscribe();
			instance.model.on('trigger', function (data) {
			    called = called + 1;
			});

			context.socket._receive(randomId(), {
			    subject: 'trigger'
			    , trigger: 'trigger'
			});

			context.socket._receive(instance.channel, {
			    subject: 'trigger'
			    , trigger: 'trigger'
			});

		    });

		});

		
	    });

	});

    });

});
