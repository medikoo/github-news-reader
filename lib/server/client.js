'use strict';

var find    = require('es5-ext/lib/Array/prototype/find')
  , forEach = require('es5-ext/lib/Object/for-each')
  , data    = require('./data')
  , socket  = require('socket.io').listen(require('./server')).sockets

  , actions;

actions = {
	read: function (path) {
		var scope = data
		  , guid    = path.pop();

		console.log("READ", path.join('|'), guid);
		path.forEach(function (name) {
			scope = scope[name];
		});
		find.call(scope, function (art) {
			return art.guid === guid;
		}).read = true;
	},
	ignore: function (path) {
		var scope = data
		  , name  = path.pop();

		console.log("IGNORE", path.join('|'), name);
		path.forEach(function (name) {
			scope = scope[name];
		});
		scope[name] = false;
	}
};

socket.on('connection', function (socket) {
	forEach(actions, function (listener, name) {
		socket.on(name, listener);
	});
});
