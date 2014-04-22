'use strict';

var feedParser = require('feedparser')
  , request    = require('request')
  , memoize    = require('memoizee/lib/regular')
  , ee         = require('event-emitter')

  , Parser;

Parser = module.exports = function (uri) {
	this.onArticle = this.onArticle.bind(this,
		memoize.call(this.parseArticle.bind(this), 1));
	this._request = { uri: uri, headers: {}, timeout: 3000 };
};

Parser.prototype = ee({
	parse: function (body) {
		var parser = feedParser.parseString(body);
		parser.on('article', this.onArticle);
		parser.on('error', function (e) { console.log("Parse error", e.stack); });
	},
	onArticle: function (parse, article) {
		parse(article.guid, article);
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
			if (err) return;
			this.process(res);
			if (body) body = body.trim();
			if (body) {
				try { this.parse(body); } catch (e) {
					console.log("PARSE ERR", e.stack);
					return;
				}
				this.emit('update');
			}
		}.bind(this));
	}
}, true);
