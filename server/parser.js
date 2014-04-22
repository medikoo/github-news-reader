'use strict';

var FeedParser = require('feedparser')
  , request    = require('request')
  , memoize    = require('memoizee/lib/regular')
  , ee         = require('event-emitter')

  , Parser;

Parser = module.exports = function (uri) {
	this.onArticle = this.onArticle.bind(this,
		memoize(this.parseArticle.bind(this), 1));
	this._request = { uri: uri, headers: {}, timeout: 3000 };
};

Parser.prototype = ee({
	parse: function (stream) {
		stream.pipe(this.parser);
	},
	onArticle: function (parse, article) {
		parse(article.guid, article);
	},
	parseArticle: function (guid, article) {
		console.log("Article:", guid);
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
		var req = request(this._request);
		req.on('error', function (err) {
			console.log(err.stack);
		});
		req.on('response', function (res) {
			var onArticle = this.onArticle;
			console.log("Fetch feed");
			this.parser = new FeedParser();
			this.parser.on('error', function (e) {
				console.log("Parse error", e.stack);
			});
			this.parser.on('readable', function () {
				var article;
				while ((article = this.read())) onArticle(article);
			});
			this.process(res);
			try { this.parse(req); } catch (e) {
				console.log("PARSE ERR", e.stack);
				return;
			}
			this.emit('update');
		}.bind(this));
	}
}, true);
