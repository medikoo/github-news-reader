'use strict';

var resolve      = require('path').resolve
  , createServer = require('http').createServer
  , staticServer = require('node-static').Server
  , partial      = require('es5-ext/lib/Function/prototype/partial')
  , config       = require('../../config')
  , webmake      = require('./webmake')

  , root = resolve(__dirname, '../../')

  , server

staticServer = new staticServer(resolve(root, 'public'));

server = module.exports = createServer(function (req, res) {
	req.addListener('end', function () {
		if (config.dev && (req.url === '/j/main.js')) {
			res.writeHead(200, { 'Content-Type':
				'application/javascript; charset=utf-8',
				'Cache-Control': 'no-cache' });
			webmake()(res.end.bind(res)).end();
		} else {
			staticServer.serve(req, res);
		}
	});
})
server.listen(config.port);

require('./client');
