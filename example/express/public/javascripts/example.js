
var socket = io.connect();

var CounterModel = Backbone.Model.extend({
});

var client = new venaclient.Client(socket);

var counterService = new client.Service('counter', CounterModel, {
    methods: ['incr']
});

var syncCounterService = new client.Service('syncCounter', CounterModel, {
    methods: ['incr']
});


var CounterView = Backbone.View.extend({
    initialize: function (options) {
	var _this = this;
	_this.service = options.service;
	_this.model = options.service.model;
	_this.listenTo(_this.model, 'change', _this.render);
	_this.$('.incrButton').click(function () {
	    _this.service.incr();
	});
	_this.$('.incrButton2').click(function () {
	    _this.service.incr();
	    _this.service.incr();
	});

    }
    , render: function () {
	this.$('.value').text(this.model.get('count'))
    }
})

socket.on('counterChannel', function (channel) {
    console.log('counterChannel = ', channel);
    var counter = counterService.get(channel);
    counter.subscribe();
    new CounterView({
	service: counter
	, el: '#counter'
    });
});

socket.on('syncCounterChannel', function (channel) {
    console.log('syncCounterChannel = ', channel);
    var counter = syncCounterService.get(channel);
    counter.subscribe();
    new CounterView({
	service: counter
	, el: '#syncCounter'
    });
});