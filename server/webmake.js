"use strict";

const { resolve }   = require("path")
    , pluck         = require("es5-ext/function/pluck")
    , partial       = require("es5-ext/function/#/partial")
    , compact       = require("es5-ext/object/compact")
    , count         = require("es5-ext/object/count")
    , every         = require("es5-ext/object/every")
    , map           = require("es5-ext/object/map")
    , { promisify } = require("deferred")
    , log           = require("log4").getNs("github-news-reader")
    , writeFile     = promisify(require("fs").writeFile)
    , webmake       = require("webmake")
    , data          = require("./data");

const { isArray } = Array
    , { stringify } = JSON
    , badChars = /\u2028/g
    , rootPath = resolve(__dirname, "../")
    , rssString = "\"{ RSS }\"";

let inProgress;

module.exports = function self(save) {
	if (save && inProgress) {
		if (inProgress !== true) {
			inProgress(partial.call(self, true));
			inProgress = true;
		}
		return null;
	}

	const copy = compact(
		map(data, function processItem(value) {
			if (isArray(value)) {
				return every(value, pluck("read"))
					? null
					: value.map(
							function (art) {
								const obj = {};
								this.forEach(name => {
									obj[name] = art[name];
								});
								return obj;
							},
							[
								"author",
								"date",
								"description",
								"guid",
								"headTitle",
								"link",
								"read",
								"skipAuthor",
								"skipTitle",
								"title"
							]
						);
			}
			if (value) {
				value = compact(map(value, processItem));
				return count(value) ? value : null;
			}
			return null;
		})
	);

	return inProgress = webmake(resolve(rootPath, "client/index.js"))(content => {
		const index = content.indexOf(rssString);
		content =
			content.slice(0, index) +
			stringify(copy, null, "\t").replace(badChars, "") +
			content.slice(index + rssString.length);
		if (save) {
			return writeFile(resolve(rootPath, "public/j/main.js"), content)(() => {
				log("Client application updated");
				inProgress = false;
			});
		}
		inProgress = false;
		return content;
	});
};
