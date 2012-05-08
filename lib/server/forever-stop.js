'use strict';

var resolve  = require('path').resolve
  , forever  = require('forever')
  , deferred = require('deferred')
  , flist    = deferred.promisify(forever.list.bind(forever), 1)

  , file = resolve(__dirname, 'server.js');

module.exports = function () {
	return flist()(function (arr) {
		var d = deferred();
		if (arr && arr.some(function (process, index) {
				if (process.file === file) {
					console.log("Stop Application");
					forever.stop(index).once('stop', d.resolve);
					return true;
				}
				return false;
			})) {
			return d.promise;
		} else {
			return d.resolve(true);
		}
	});
};
