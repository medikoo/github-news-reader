'use strict';

var resolve   = require('path').resolve
  , format    = require('es5-ext/lib/Date/get-format')('%m-%d.%H:%M:%S.%L')
  , promisify = require('deferred').promisify
  , exec      = promisify(require('child_process').exec)

  , root = resolve(__dirname, '../../')
  , foreverPath = resolve(root, 'node_modules/forever/bin/forever')
  , pidFile = resolve(root, 'process.pid')

  , time;

module.exports = function () {
	var cmd;
	console.log('Start Application');
	time = format.call(new Date());
	cmd = foreverPath + ' start '
		+ '--pidfile ' + pidFile + ' '
		+ '--logFile ' + resolve(root, 'log', time + '.log') + ' '
		+ '--outFile ' + resolve(root, 'log', time + '.out.log') + ' '
		+ '--errFile ' + resolve(root, 'log', time + '.err.log') + ' '
		+ resolve(__dirname, 'server.js');
	return exec(cmd, { env: process.env }).match(function (out, err) {
		process.stdout.write(out);
		process.stderr.write(err);
	});
};
