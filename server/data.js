/* eslint max-lines: "off" */

"use strict";

const isFunction = require("es5-ext/function/is-function")
    , partial    = require("es5-ext/function/#/partial")
    , isNumber   = require("es5-ext/number/is-number")
    , isObject   = require("es5-ext/object/is-object")
    , isValue    = require("es5-ext/object/is-value")
    , contains   = require("es5-ext/string/#/contains")
    , startsWith = require("es5-ext/string/#/starts-with")
    , memoize    = require("memoizee")
    , log        = require("log4").getNs("github-news-reader")
    , GithubApi  = require("github")
    , { decode } = require("ent")
    , config     = require("../env")
    , logToMail  = require("./log-to-mail")
    , Parser     = require("./parser");

const reType = /^tag:github\.com,\d+:([A-Za-z0-9]+)\/\d+$/
    , reURI = new RegExp(
		"(?:http|https):\\/\\/(?:\\w+:{0,1}\\w*@)?(?:\\S+)" +
			"(:[0-9]+)?(?:\\/|\\/(?:[\\w#!:.?+=&%@!\\-\\/]))?",
		"gi"
	)
    , github = new GithubApi();

const sort = function (item1, item2) {
	return Date.parse(item1.date) - Date.parse(item2.date);
};

const logArticleToMail = function (subject, body) {
	if (isObject(body)) {
		body = [body.guid, body.link, body.description].join("\n\n");
	}
	logToMail(subject, body);
};

if (config.auth) github.authenticate(config.auth);

const logAPIError = memoize(
	(message, article, err) => {
		logArticleToMail("API responded with an error", `${ article.link } ${ err }`);
	},
	{ length: 1, maxAge: 15 * 60 * 1000, primitive: true }
);

const fixLinks = function (article) {
	article.description = article.description.replace(/ href="\//g, " href=\"https://github.com/");
	article.skipTitle = true;
	article.skipAuthor = true;
};

const parse = function (re, map, normalize, article) {
	const match = article.link.match(re), names = [];
	let scope = this, name;
	if (!match) {
		logArticleToMail("Could not parse link", article);
		return;
	}
	map.forEach((key, index) => {
		if (isNumber(key)) name = decodeURIComponent(match[key]);
		else if (isFunction(key)) name = key(article, match);
		else name = key;
		if (!isValue(scope[name])) {
			scope[name] = index === map.length - 1 ? [] : {};
		}
		names.push(name);
		scope = scope[name];
	});
	if (scope) {
		log("Added article", names.join("|"));
		normalize(article, match);
		scope.push(article);
		scope.sort(sort);
	} else {
		log("Ignored article", names.join("|"));
	}
};

const parseUser = function (name, normalize, article) {
	const { author } = article;
	let scope;
	if (!this.User) this.User = {};
	scope = this.User;
	if (!scope[author]) scope[author] = {};
	scope = scope[author];
	if (!isValue(scope[name])) scope[name] = [];
	if (scope[name]) {
		normalize(article);
		scope[name].push(article);
		scope[name].sort(sort);
	} else {
		log("Ignored user", name);
	}
};

const toHTML = function (str) {
	if (!str) return "";
	return str
		.split("\n")
		.map(line => {
			let cls;
			if (startsWith.call(line, ">")) {
				cls = "email-quoted";
				line = line.slice(1);
			}
			return `<p${ cls ? ` class="${ cls }"` : "" }>${ line
				.replace("/>/g", "&gt;")
				.replace("/>/g", "&lt;")
				.replace("/&/g", "&amp;")
				.replace("/\"/g", "&quot;")
				.replace(reURI, match => `<a href="${ match }">${ match }</a>`) }</p>`;
		})
		.join("");
};

const titleFromAttr = function (article) {
	let match = article.description.match(/title="([\0-!#-\uffff]+)"/);
	if (match) {
		article.headTitle = decode(match[1]);
		return;
	}
	match = article.description.match(/" aria-label="([\0-!#-\uffff]+)"/);
	if (match) {
		article.headTitle = decode(match[1]);
		return;
	}
	logArticleToMail("Could not parse title", article.description);
};

const titleFromBlockquote = function (article) {
	const match = article.description.match(/<blockquote>([\0-;=-\uffff]+)<\/blockquote>/);
	if (match) article.headTitle = decode(match[1]);
	else logArticleToMail("Could not parse title from blockquote", article.description);
};

const bodyFromAPI = function (article) {
	return function (err, obj) {
		if (err) {
			if (contains.call(err.message, "Issues are disabled for this repo")) {
				return;
			}
			if (contains.call(err.message, "Not Found")) return;
			if (contains.call(err.message, "Server Error")) return;
			logAPIError(err.message, article, err);
			return;
		}
		article.description = article.description.replace(
			/<blockquote([\0-\uffff]+)<\/blockquote>/,
			`<blockquote>${ toHTML(obj.body) }</blockquote>`
		);
		log("Updated description from API");
		if (!config.dev) {
			require("./webmake")(true);
		}
	};
};

const handleOpenIssue = function (article, match) {
	let itemData;
	fixLinks(article);
	titleFromBlockquote(article);
	if (
		contains.call(article.title, "opened issue") ||
		contains.call(article.title, "opened pull request")
	) {
		itemData = match[1].split("/");
		github.issues.getForRepo(
			{
				user: itemData[0],
				repo: itemData[1],
				number: match[2]
			},
			bodyFromAPI(article)
		);
	} else if (
		contains.call(article.title, "closed issue") ||
		contains.call(article.title, "closed pull request")
	) {
		article.description = article.description
			.replace(/<blockquote>([\0-\uffff]+)<\/blockquote>/, "")
			.replace(" class=\"details\">", " class=\"details\" style=\"display:none\">");
	}
};

const instructions = {
	commitcommentevent: partial.call(
		parse,
		new RegExp(
			"^https:\\/\\/github\\." +
				"com\\/([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/commit\\/" +
				"([a-z0-9\\.\\-]+)#([\\0-\\uffff]+)$"
		),
		["Repo", 1, "Commits"],
		fixLinks
	),
	createevent: partial.call(parseUser, "Created", fixLinks),
	deleteevent: partial.call(parseUser, "Deleted", fixLinks),
	followevent: partial.call(parseUser, "Followed", fixLinks),
	forkevent: partial.call(parseUser, "Forked", fixLinks),
	gistevent: partial.call(parse, /\/(\d+)$/, ["Gist", 1], article => {
		const titleMatch = article.description.match(
			/div class="message">([\0-;=-\uffff]+)<\/div>/
		);
		if (titleMatch) article.headTitle = `${ article.author }: ${ titleMatch[1] }`;
		fixLinks(article);
	}),
	gollumevent: partial.call(
		parse,
		new RegExp(
			"^https:\\/\\/github\\.com\\/" +
				"([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/wiki\\/([\\0-\\uffff]+)$"
		),
		["Repo", 1, "Wiki", 2],
		fixLinks
	),
	issuecommentevent: partial.call(
		parse,
		new RegExp(
			"^https:\\/\\/github\\." +
				"com\\/([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/(?:issues|pull)\\/" +
				"(\\d+)#issuecomment-(\\d+)$"
		),
		["Repo", 1, "Issues & Pull Requests", 2],
		(article, orgmatch) => {
			let data;
			fixLinks(article);
			titleFromAttr(article);
			if (contains.call(article.description, "…</p>")) {
				data = orgmatch[1].split("/");
				github.issues.getComment(
					{
						user: data[0],
						repo: data[1],
						id: orgmatch[3]
					},
					bodyFromAPI(article)
				);
			}
		}
	),
	issuesevent: partial.call(
		parse,
		new RegExp(
			"^https:\\/\\/github\\.com\\/" +
				"([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/issues\\/(\\d+)$"
		),
		["Repo", 1, "Issues & Pull Requests", 2],
		handleOpenIssue
	),
	memberevent: partial.call(parseUser, "Added members", fixLinks),
	publicevent: partial.call(parseUser, "Published", fixLinks),
	releaseevent: partial.call(parseUser, "Released", fixLinks),
	pullrequestevent: partial.call(
		parse,
		new RegExp(
			"^https:\\/\\/github\\." +
				"com\\/([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/pull\\/(\\d+)$"
		),
		["Repo", 1, "Issues & Pull Requests", 2],
		handleOpenIssue
	),
	pullrequestreviewcommentevent: partial.call(
		parse,
		new RegExp(
			"^https:" +
				"\\/\\/github\\.com\\/([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/pull" +
				"\\/(\\d+)#(?:discussion_)?r(\\d+)$"
		),
		["Repo", 1, "Issues & Pull Requests", 2],
		(article, orgmatch) => {
			let dataItem;
			fixLinks(article);
			if (contains.call(article.description, "…</p>")) {
				dataItem = orgmatch[1].split("/");
				github.pullRequests.getComment(
					{
						user: dataItem[0],
						repo: dataItem[1],
						number: orgmatch[3]
					},
					bodyFromAPI(article)
				);
			}
		}
	),
	pushevent: partial.call(
		parse,
		new RegExp(
			"^https:\\/\\/github\\.com\\/" +
				"([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/compare\\/([a-z0-9\\.]+)$"
		),
		["Repo", 1, "Commits"],
		fixLinks
	),
	watchevent: partial.call(parseUser, "Watching", fixLinks)
};

const url = `https://github.com/${ config.user }.private.atom?token=${ config.token }`;
const parser = new Parser(url);
const data = {};

module.exports = data;

parser.on("article", article => {
	let type = article.guid.match(reType);
	if (!type) {
		logArticleToMail("Article with no guid", article);
		return;
	}
	type = type[1].toLowerCase();

	if (!instructions[type]) {
		logArticleToMail("Not supported article type", article);
		return;
	}
	instructions[type].call(data, article);
	if (!config.dev) require("./webmake")(true);
});

parser.get();
setInterval(parser.get.bind(parser), 15000);
