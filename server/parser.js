"use strict";

const log        = require("log4").getNs("github-news-reader")
    , FeedParser = require("feedparser")
    , request    = require("request")
    , memoize    = require("memoizee")
    , ee         = require("event-emitter");

const Parser = module.exports = function (uri) {
	this.onArticle = this.onArticle.bind(
		this,
		memoize(this.parseArticle.bind(this), { length: 1, primitive: true })
	);
	this._request = { uri, headers: {}, timeout: 3000 };
};

Parser.prototype = ee(
	{
		parse(stream) {
			stream.pipe(this.parser);
		},
		onArticle(parse, article) {
			parse(article.guid, article);
		},
		parseArticle(guid, article) {
			log("Article:", guid);
			this.emit("article", article);
		},
		process(res) {
			const { headers } = res;
			if (headers.etag) {
				this._request.headers["If-None-Match"] = headers.etag;
			}
			if (headers["Last-Modified"]) {
				this._request.headers["If-Modified-Since"] = headers["Last-Modified"];
			}
		},
		get() {
			const req = request(this._request);
			req.on("error", err => {
				log(err.stack);
			});
			req.on("response", res => {
				const { onArticle } = this;
				log("Fetch feed");
				this.parser = new FeedParser();
				this.parser.on("error", e => {
					if (res.headers.status === "304 Not Modified") return;
					log("Parse error", e.stack);
				});
				this.parser.on("readable", function () {
					let article;
					while ((article = this.read())) onArticle(article);
				});
				this.process(res);
				try {
					this.parse(req);
				} catch (e) {
					log("PARSE ERR", e.stack);
					return;
				}
				this.emit("update");
			});
		}
	},
	true
);
