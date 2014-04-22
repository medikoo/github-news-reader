'use strict';

var isArray      = Array.isArray
  , stringify    = JSON.stringify
  , resolve      = require('path').resolve
  , pluck        = require('es5-ext/function/pluck')
  , partial      = require('es5-ext/function/#/partial')
  , compact      = require('es5-ext/object/compact')
  , count        = require('es5-ext/object/count')
  , every        = require('es5-ext/object/every')
  , map          = require('es5-ext/object/map')
  , promisify    = require('deferred').promisify
  , writeFile    = promisify(require('fs').writeFile)
  , webmake      = require('webmake')

  , data, root = resolve(__dirname, '../'), build, inProgress;

module.exports = function self(save) {
	if (save && inProgress) {
		if (inProgress !== true) {
			inProgress(partial.call(self, true));
			inProgress = true;
		}
		return null;
	}

	var copy = compact(map(data, function self(value, key) {
		if (isArray(value)) {
			return every(value, pluck('read')) ? null : value.map(function (art) {
				var obj = {};
				this.forEach(function (name) {
					obj[name] = art[name];
				});
				return obj;
			}, ['author', 'date', 'description', 'guid', 'headTitle', 'link', 'read',
				 'skipAuthor', 'skipTitle', 'title']);
		} else if (value) {
			value = compact(map(value, self));
			return count(value) ? value : null;
		} else {
			return null;
		}
	}));

	return inProgress = webmake(resolve(root, 'lib/client/index.js'))(
		function (content) {
			var index = content.indexOf('%RSS%');
			content = content.slice(0, index) +
				stringify(stringify(copy)).slice(1, -1) + content.slice(index + 5);
			if (save) {
				return writeFile(resolve(root, 'public/j/main.js'), content)(function () {
					console.log("Client application updated");
					inProgress = false;
				});
			} else {
				inProgress = false;
			}
			return content;
		}
	);
};

data = require('./data')
