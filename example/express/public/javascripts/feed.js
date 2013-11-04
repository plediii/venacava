
var setupFeed = function(client) {

    var FeedCollection = Backbone.Collection.extend({});

    var feedService = new client.Service('feed', FeedCollection, {
	methods: ['push']
    });

    var MsgView = Backbone.View.extend({
	tagName: 'div'
	, render: function () {
	    var _this = this
	    ;
	    _this.$el.text(_this.model.get('text'));
	    return _this;
	}
    })

    var FeedView = Backbone.View.extend({
	initialize: function (options) {
	    var _this = this;
	    _this.service = options.service;
	    _this.collection = options.service.model;
	    _this.listenTo(_this.collection, 'add', _this.renderOne);
	    _this.listenTo(_this.collection, 'reset', _this.renderAll);
	    _this.$('.msgButton').click(function () {
		_this.service.push({ text: _this.$('.msg').val() })
	    });

	    var sendChat = function () {
		_this.service.push({ text: _this.$('.msg').val().slice(0,20) });
		_this.$('.msg').val('');
	    };

	    _this.$('.msg').keypress(function (evt) {
		if (evt.which  === 13) {
		    evt.preventDefault();
		    sendChat();
		    return false;
		}
		return true;
	    });
	    return _this;
	}
	, renderOne: function (msg) {
	    var _this = this
	    , view = new MsgView({model: msg})
	    ;
	    _this.$('.msgs').append((new MsgView({model: msg})).render().el);
	    return _this;
	}
	, renderAll: function () {
	    console.log('renderAll');
	    this.$el.empty();
	    this.model.each(this.renderOne, this);
	}
    });

    $(function () {
	var feed = feedService.get('feed');
	feed.subscribe();
	new FeedView({
	    service: feed
	    , el: '#feed'
	});
    });

};
 

   