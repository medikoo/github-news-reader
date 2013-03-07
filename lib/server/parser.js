'use strict';

var FeedParser = require('feedparser')
  , request    = require('request')
  , memoize    = require('es5-ext/lib/Function/prototype/memoize')
  , ee         = require('event-emitter')

  , Parser;

Parser = module.exports = function (uri) {
	this._parser = new FeedParser();
	this._parser.on('article', function (parse, article) {
		parse(article.guid, article);
	}.bind(this, memoize.call(this.parseArticle.bind(this), 1)));
	this._request = { uri: uri, headers: {} };
};

Parser.prototype = ee({
	parse: function (body) {
		this._parser.parseString(body);
	},
	parseArticle: function (guid, article) {
		this.emit('article', article);
	},
	process: function (res) {
		var headers = res.headers;
		if (headers.etag) {
			this._request.headers['If-None-Match'] = headers.etag;
		}
		if (headers['Last-Modified']) {
			this._request.headers['If-Modified-Since'] = headers['Last-Modified'];
		}
	},
	get: function () {
		request(this._request, function (err, res, body) {
			if (err) {
				console.log(err);
				return;
			}
			this.process(res);
			if (body) body = body.trim();
			if (body) {
				try { this.parse(body); } catch (e) { return; }
				this.emit('update');
			}
		}.bind(this));
	}
}, true);
