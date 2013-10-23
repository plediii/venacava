
var socket = io.connect();

var CounterModel = Backbone.Model.extend({
});

var client = new venaclient.Client(socket);

var counterService = new client.Service('counter', CounterModel, {
    methods: ['incr']
});

var CounterView = Backbone.View.extend({
    initialize: function () {
	this.listenTo(this.model, 'change', this.render);
    }
    , render: function () {
	this.$('.value').text(this.model.get('count'))
    }
})

socket.on('counterChannel', function (channel) {
    console.log('counterChannel = ', channel);
    var counter = counterService.get(channel);
    new CounterView({
	model: counter.model
	, el: '#counter'
    });
    counter.subscribe();
    counter.incr();
});