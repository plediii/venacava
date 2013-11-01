
/**
 * Module dependencies.
 */

var express = require('express')
, http = require('http')
, path = require('path')
, _ = require('underscore')
, fs = require('fs')
, redis = require('redis')
, venacava = require(__dirname + '/../../venacava')
;

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', function (req, res) {
    res.redirect('index.html');
});

_.each([
    ['/lib/underscore-min.js', 'node_modules/underscore/underscore-min.js']
    , ['/lib/backbone-min.js', 'node_modules/backbone/backbone-min.js']
    , ['/lib/venaclient.js', '../../venaclient.js']
], function (staticMap) {
    var url = staticMap[0]
    , filePath = staticMap[1]
    app.get(url, function (req, res) {
	fs.readFile(filePath, function (err, data) {
	    if (err) {
		res.status(404).send('not found.');
	    }
	    else {
		res.status(200).setHeader('content-type', 'text/javscript');
		res.send(data);
	    }
	});
    });
});

var server = http.createServer(app);

var io = require('socket.io').listen(server);

var db = redis.createClient(6379);
var remitter = new venacava.RedisEmitter(db);

var counterProto = {
    defaults: {
	count: 0
    }
    , methods: {
	incr: function () {
	    var _model = this;
	    _model.core.fetch(function (err) {
		if (!err) {
		    _model.core.set({
			count: 1 + _model.core.get('count')
		    });
		}
	    });
	}
    }
};

var counterModel = new venacava.Model('counter', counterProto);

var counterService = new venacava.Service({
    system: counterModel
    , methods: {
	incr: function () {
	    this.system.incr();
	}
	, subscribe: function () {
	    var _this = this
	    , core = this.system.core
	    , channel = core.channel
	    ;
	    _this.session.relay.subscribe(channel);
	    core.fetch(function (err) {
		if (err) {
		    throw err;
		}
		_this.socket.emit(channel, {
		    subject: 'set'
		    , body: core.toJSON()
		});
	    });
	}
    }
}); 

var syncCounterModel = new venacava.Model('syncCounter', counterProto);

var counterProxy = new venacava.Proxy({
    model: syncCounterModel
    , methods: {
	incr: function (done) {
	    this.model.core.set({
		count: 1 + this.model.core.get('count')
	    });
	    done();
	}
	, fetch: function (done) {
	    console.log('proxy fetch', this.model.core.toJSON());
	    return done(this.model.core.toJSON());
	}
    }
})


var syncCounterService = new venacava.Service({
    system: counterProxy
    , methods: {
	incr: function () {
	    console.log('sync incr');
	    this.system.incr();
	}
	, subscribe: function () {
	    var _this = this
	    , channel = _this.system.channel
	    ;
	    _this.session.relay.subscribe(channel);
	    _this.system.fetch(function (body) {
		_this.socket.emit(channel, {
		    subject: 'set'
		    , body: body
		});
	    });
	}
    }
});


var asyncCounterId = 'async'
, syncCounterId = 'sync'
;

counterModel.createIfNotExists(asyncCounterId, function (err, model) {
    model.core.fetch(function (err) {
	console.log('initial async = ', model.core.toJSON());
    });
});
counterModel.createIfNotExists(syncCounterId, function (err, model) {
    model.core.fetch(function (err) {
	console.log('initial sync = ', model.core.toJSON());
    });
});




io.on('connection', function (socket) {
    var session = {
	relay: new venacava.Relay(socket, remitter)
    };
    counterService.serve(socket, session);
    syncCounterService.serve(socket, session);
});

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
