'use strict';

var find    = require('es5-ext/array/#/find')
  , forEach = require('es5-ext/object/for-each')
  , config  = require('../env')
  , data    = require('./data')
  , webmake = require('./webmake')
  , socket  = require('socket.io').listen(require('./server')).sockets

  , actions;

actions = {
	read: function (path) {
		var scope = data, guid = path.pop(), art;

		console.log("Save as read \"" + path.join('|') + "\"", guid);
		path.forEach(function (name) {
			if (!scope) return;
			scope = scope[name];
		});
		if (!scope) {
			console.error("!Not found! \"" + path.join('|') + "\"", guid);
			return;
		}
		art = find.call(scope, function (art) {
			return art.guid === guid;
		});
		if (!art) {
			console.error("!Not found! \"" + path.join('|') + "\"", guid);
			return;
		}
		art.read = true;
		if (!config.dev) webmake(true);
	},
	ignore: function (path) {
		var scope = data
		  , name  = path.pop();

		console.log("Save as ignored \"" + path.join('|') + "\"", name);
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
