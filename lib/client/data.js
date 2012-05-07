'use strict';

var isArray = Array.isArray
  , pluck   = require('es5-ext/lib/Function/pluck')
  , not     = require('es5-ext/lib/Function/prototype/not')
  , count   = require('es5-ext/lib/Object/count')
  , forEach = require('es5-ext/lib/Object/for-each')
  , map     = require('es5-ext/lib/Object/map')
  , ee      = require('event-emitter')

  , markRead;

markRead = function () {
	if (!this.read) {
		this.read = true;
		this.emit('update', { type: 'read' });
	}
};

var data = JSON.parse("%RSS%");

console.log("DATA", data);

module.exports = exports = map(data, function self(data, name) {
	if (isArray(data)) {
		data = ee(data);
		data.forEach(function (article) {
			ee(article);
			article.on('update', function () {
				data.emit('update');
			});
			article.markRead = markRead
		});
	} else {
		data = ee(map(data, self));
		forEach(data, function (obj, name) {
			if (isArray(obj)) {
				obj.on('update', function () {
					if (!this.filter(not.call(pluck('read'))).length) {
						delete data[name];
						data.emit('update');
					}
				});
				obj.on('ignore', function () {
					delete data[name];
					data.emit('update');
				});
			} else {
				obj.on('update', function () {
					if (!count(this)) {
						delete data[name];
						data.emit('update');
					}
				});
			}
		});
	}
	return data;
});

forEach(exports, function (obj, name) {
	obj.on('update', function () {
		if (!count(this)) {
			delete exports[name];
		}
	});
});
