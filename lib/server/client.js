'use strict';

var find    = require('es5-ext/lib/Array/prototype/find')
  , forEach = require('es5-ext/lib/Object/for-each')
  , config  = require('../../config')
  , data    = require('./data')
  , webmake = require('./webmake')
  , socket  = require('socket.io').listen(require('./server')).sockets

  , actions;

actions = {
	read: function (path) {
		var scope = data
		  , guid    = path.pop();

		console.log("READ", path.join('|'), guid);
		path.forEach(function (name) {
			if (!scope) return;
			scope = scope[name];
		});
		if (!scope) {
			console.error("!NOT FOUND!", path.join('|'), guid);
			return;
		}
		find.call(scope, function (art) {
			return art.guid === guid;
		}).read = true;
		if (!config.dev) webmake(true);
	},
	ignore: function (path) {
		var scope = data
		  , name  = path.pop();

		console.log("IGNORE", path.join('|'), name);
		path.forEach(function (name) {
			scope = scope[name];
		});
		scope[name] = false;

		if (!config.dev) webmake(true);
	}
};

socket.on('connection', function (socket) {
	forEach(actions, function (listener, name) {
		socket.on(name, listener);
	});
});
