"use strict";

const find    = require("es5-ext/array/#/find")
    , forEach = require("es5-ext/object/for-each")
    , log     = require("log4").getNs("github-news-reader")
    , config  = require("../env")
    , data    = require("./data")
    , webmake = require("./webmake")
    , socket  = require("socket.io").listen(require("./server")).sockets;

const actions = {
	read(path) {
		let scope = data;
		const guid = path.pop();

		log(`Save as read "${ path.join("|") }"`, guid);
		path.forEach(name => {
			if (!scope) return;
			scope = scope[name];
		});
		if (!scope) {
			log.error(`!Not found! "${ path.join("|") }"`, guid);
			return;
		}
		const art = find.call(scope, artCandidate => artCandidate.guid === guid);
		if (!art) {
			log.error(`!Not found! "${ path.join("|") }"`, guid);
			return;
		}
		art.read = true;
		if (!config.dev) webmake(true);
	},
	ignore(path) {
		let scope = data;
		const name = path.pop();

		log(`Save as ignored "${ path.join("|") }"`, name);
		path.forEach(pathToken => {
			if (!scope) return;
			scope = scope[pathToken];
		});
		if (!scope) {
			log.error(`!Not found! "${ path.join("|") }"`, name);
			return;
		}
		scope[name] = false;

		if (!config.dev) webmake(true);
	}
};

socket.on("connection", connectedSocket => {
	forEach(actions, (listener, name) => {
		connectedSocket.on(name, listener);
	});
});
