
var venaclient = require('../venaclient.js')
, assert = require('assert')
, EventEmitter = require('events').EventEmitter
, _ = require('underscore')
, Backbone = require('backbone')
, MockSocet = require('mocksocket').MockSocket
;

var randomId = function () {
    return 'test' + Math.floor(Math.random() * 1000000);
};

var newContext = function () {
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
	, service: new client.Service(name, Model)
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
		it('should be of the expected type', function () {
		    var context = newContext();
		    assert(context.service.get(randomId()) instanceof context.Model);
		});


		describe('#service', function () {

		    it('should exist', function () {
			var context = newContext();
			assert(_.isOjbect(context.service.get(randomId()).service));
		    });

		    it('should have the instance channel', function () {
			var channel = randomId();
			assert.equal(newcontext().service.get(channel).service.channel, channel);
		    });

		    describe('#socket', function () {
			it('should exist', function () {
			    var context = newContext();
			    assert(_.isOjbect(context.service.get(randomId()).service.socket));
			});

			it('should be the service socket', function () {
			    var context = newContext();
			    assert.equal(context.service.get(randomId()).service.socket, context.socket);
			});
		    });

		    describe('#subscribe', function () {
			it('should exist', function () {
			    var context = newContext();
			    assert.equal(typeof context.service.get(randomId()).service.subscribe, 'function');
			});

			it('should trigger "set" updates on the model', function (done) {
			    var context = newContext()
			    , channel = randomId()
			    , instance = context.service.get(channel)
			    ;
			    instance.service.subscribe();
			    instance.on('change:x', function () {
				assert.equal(instance.get('x'), 1);
				done();
			    })
			    context.socket._receive(instance.service.channel, {
				subject: 'set'
				, body: {
				    x: 1
				}
			    });
			});

			it('should trigger "unset" updates on the model', function (done) {
			    var context = newContext()
			    , channel = randomId()
			    , instance = context.service.get(channel)
			    ;
			    instance.service.subscribe();
			    instance.on('change:x', function () {
				assert(!instance.has('x'));
				done();
			    })
			    context.socket._receive(instance.service.channel, {
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
			    assert.equal(typeof context.service.get(randomId()).service.subscribe, 'function');
			});

			it('should trigger "unset" updates on the model', function () {
			    var context = newContext()
			    , channel = randomId()
			    , instance = context.service.get(channel)
			    , called = 0
			    ;
			    instance.service.subscribe();
			    instance.on('change:x', function () {
				called = called + 1
			    });
			    context.socket._receive(instance.service.channel, {
				subject: 'set'
				, body: {
				    x: 1
				}
			    });
			    instance.service.unsubscribe();
			    context.socket._receive(instance.service.channel, {
				subject: 'set'
				, body: {
				    x: 2
				}
			    });
			    assert.equal(called, 1);
			});
		    });

		    describe(':methods', function () {
			
			it('should exist', function () {
			    var context = newContext({
				methods: ['method']
			    });
			    assert.equal(typeof context.service.get(randomId()).service.method, 'function');
			});

			it('should transmit the method over the socket', function (done) {
			    var context = newContext({
				methods: ['method']
			    })
			    , instance = context.service.get(randomId())
			    ;
			    context.socket._emit(instance.service.name, function (msg) {
				assert.equal(msg.channel, instance.service.channel);
				assert.equal(msg.method, 'method');
				assert(msg.hasOwnProperty('data'), 'service method invocation msg did not have a data property.')
				assert.equal(msg.data.x, 1);
			    });
			    instance.serivce.method({
				x: 1
			    });
			});

		    });

		    describe('#on', function () {
			
			it('should be triggered by socket events for the target channel', function (done) {
			    var context = newContext({
				methods: ['method']
			    })
			    , instance = context.service.get(randomId())
			    ;
			    instance.service.on('trigger', function (data) {
				done();
			    });

			    context.socket._receive(instance.service.channel, {
				trigger: 'trigger'
			    });
			});

			it('should be triggered with data', function (done) {
			    var context = newContext({
				methods: ['method']
			    })
			    , instance = context.service.get(randomId())
			    ;
			    instance.service.on('trigger', function (data) {
				asser.equal(data.x, 1);
				done();
			    });

			    context.socket._receive(instance.service.channel, {
				trigger: 'trigger'
				, data: {
				    x: 1
				}
			    });
			});

			it('should not be triggered by socket events for other channels', function (done) {
			    var context = newContext({
				methods: ['method']
			    })
			    , instance = context.service.get(randomId())
			    ;
			    instance.service.on('trigger', function (data) {
				done();
			    });

			    context.socket._receive(randomId(), {
				trigger: 'trigger'
			    });
			});



		    });

		});

		
	    });

	});

    });

});
