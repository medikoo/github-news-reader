'use strict';

var isArray = Array.isArray
  , copy    = require('es5-ext/lib/Array/prototype/copy')
  , forEach = require('es5-ext/lib/Object/for-each')
  , data    = require('./data')
  , socket  = io.connect(location.protocol + '//' + location.host)

  , path = [];

forEach(data, function self(value, name, context) {
	path.push(name);
	if (isArray(value)) {
		value.$path = copy.call(path);
		value.forEach(function (article) {
			article.on('update', function (e) {
				if (e && (e.type === 'read')) {
					socket.emit('read', value.$path.concat(article.guid));
				}
			});
		});

		value.on('ignore', function () {
			socket.emit('ignore', value.$path);
		});
	} else {
		forEach(value, self);
	}
	path.pop();
});
