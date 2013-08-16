'use strict';

Error.stackTraceLimit = Infinity;

var resolve      = require('path').resolve
  , createServer = require('http').createServer
  , StaticServer = require('node-static').Server
  , config       = require('../../config')
  , webmake      = require('./webmake')

  , root = resolve(__dirname, '../../')

  , server, staticServer;

staticServer = new StaticServer(resolve(root, 'public'));

server = module.exports = createServer(function (req, res) {
	if (config.dev && (req.url === '/j/main.js')) {
		res.writeHead(200, { 'Content-Type':
			'application/javascript; charset=utf-8',
			'Cache-Control': 'no-cache' });
		webmake()(res.end.bind(res)).end();
	} else {
		staticServer.serve(req, res);
	}
});
server.listen(config.port);

require('./client');
