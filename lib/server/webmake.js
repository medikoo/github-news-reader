'use strict';

var isArray      = Array.isArray
  , stringify    = JSON.stringify
  , resolve      = require('path').resolve
  , pluck        = require('es5-ext/lib/Function/pluck')
  , compact      = require('es5-ext/lib/Object/compact')
  , count        = require('es5-ext/lib/Object/count')
  , every        = require('es5-ext/lib/Object/every')
  , map          = require('es5-ext/lib/Object/map')
  , webmake      = require('webmake')
  , data         = require('./data')

  , root = resolve(__dirname, '../../'), build

module.exports = function (save) {
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
			return false;
		}
	}));

	return webmake(resolve(root, 'lib/client/public/main.js'))
		.invoke('replace', '%RSS%', stringify(stringify(copy)).slice(1, -1),
			{ output: save && resolve(root, 'public/j/main.js') });
};
