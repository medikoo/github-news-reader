'use strict';

var isArray = Array.isArray
  , pluck   = require('es5-ext/function/pluck')
  , not     = require('es5-ext/function/#/not')
  , count   = require('es5-ext/object/count')
  , forEach = require('es5-ext/object/for-each')
  , map     = require('es5-ext/object/map')
  , ee      = require('event-emitter')

  , markRead, data;

markRead = function () {
	if (!this.read) {
		this.read = true;
		this.emit('update', { type: 'read' });
	}
};

data = ${ RSS };

console.log("DATA", data);

module.exports = exports = map(data, function self(data, name) {
	if (isArray(data)) {
		data = ee(data);
		data.forEach(function (article) {
			ee(article);
			article.on('update', function () {
				data.emit('update');
			});
			article.markRead = markRead;
		});
		data.on('ignore', function () { delete exports[name]; });
		data.on('update', function () {
			if (!this.filter(not.call(pluck('read'))).length) {
				delete exports[name];
			}
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
