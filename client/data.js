"use strict";

const pluck   = require("es5-ext/function/pluck")
    , not     = require("es5-ext/function/#/not")
    , count   = require("es5-ext/object/count")
    , forEach = require("es5-ext/object/for-each")
    , map     = require("es5-ext/object/map")
    , ee      = require("event-emitter")
    , log     = require("log4").getNs("github-news-reader");

const { isArray } = Array;

const markRead = function () {
	if (!this.read) {
		this.read = true;
		this.emit("update", { type: "read" });
	}
};

const data = "{ RSS }";

log("RSS data %o", data);

module.exports = exports = map(data, function processItem(dataItem, repoName) {
	if (isArray(dataItem)) {
		dataItem = ee(dataItem);
		dataItem.forEach(article => {
			ee(article);
			article.on("update", () => {
				dataItem.emit("update");
			});
			article.markRead = markRead;
		});
		dataItem.on("ignore", () => {
			delete exports[repoName];
		});
		dataItem.on("update", function () {
			if (!this.filter(not.call(pluck("read"))).length) {
				delete exports[repoName];
			}
		});
	} else {
		dataItem = ee(map(dataItem, processItem));
		forEach(dataItem, (obj, itemName) => {
			if (isArray(obj)) {
				obj.on("update", function () {
					if (!this.filter(not.call(pluck("read"))).length) {
						delete dataItem[itemName];
						dataItem.emit("update");
					}
				});
				obj.on("ignore", () => {
					delete dataItem[itemName];
					dataItem.emit("update");
				});
			} else {
				obj.on("update", function () {
					if (!count(this)) {
						delete dataItem[itemName];
						dataItem.emit("update");
					}
				});
			}
		});
	}
	return dataItem;
});

forEach(exports, (obj, objName) => {
	obj.on("update", function () {
		if (!count(this)) {
			delete exports[objName];
		}
	});
});
