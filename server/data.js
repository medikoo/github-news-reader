'use strict';

var isFunction = require('es5-ext/function/is-function')
  , partial    = require('es5-ext/function/#/partial')
  , isNumber   = require('es5-ext/number/is-number')
  , isObject   = require('es5-ext/object/is-object')
  , contains   = require('es5-ext/string/#/contains')
  , startsWith = require('es5-ext/string/#/starts-with')
  , memoize    = require('memoizee/lib/primitive')
  , github     = new (require('github'))({ version: "3.0.0" })
  , decode     = require('ent').decode
  , config     = require('../env')
  , logToMail  = require('./log-to-mail')
  , Parser     = require('./parser')
  , webmake    = require('./webmake')

  , reType = /^tag:github\.com,\d+:([A-Za-z0-9]+)\/\d+$/
  , reURI = new RegExp('(?:http|https):\\/\\/(?:\\w+:{0,1}\\w*@)?(?:\\S+)' +
		'(:[0-9]+)?(?:\\/|\\/(?:[\\w#!:.?+=&%@!\\-\\/]))?', 'gi')

  , process, fixLinks, sort, parse, parseUser, toHTML, titleFromAttr, url
  , titleFromBlockquote, bodyFromAPI, log, logAPIError, handleOpenIssue
  , parser, data;

require('memoizee/lib/ext/max-age');

sort = function (a, b) { return Date.parse(a.date) - Date.parse(b.date); };

log = function (subject, body) {
	if (isObject(body)) {
		body = [body.guid, body.link, body.description].join("\n\n");
	}
	logToMail(subject, body);
};

if (config.auth) github.authenticate(config.auth);

logAPIError = memoize(function (message, article, err) {
	log("API responded with an error", article.link + ' ' + err);
}, { length: 1, maxAge: 15 * 60 * 1000 });

fixLinks = function (article) {
	article.description =
		article.description.replace(/ href="\//g, ' href="https://github.com/');
	article.skipTitle = true;
	article.skipAuthor = true;
};

parse = function (re, map, normalize, article) {
	var match = article.link.match(re), scope = this, name, names = [];
	if (!match) {
		log("Could not parse link", article);
		return;
	}
	map.forEach(function (key, index) {
		if (isNumber(key)) name = decodeURIComponent(match[key]);
		else if (isFunction(key)) name = key(article, match);
		else name = key;
		if (scope[name] == null) {
			scope[name] = (index === (map.length - 1)) ? [] : {};
		}
		names.push(name);
		scope = scope[name];
	});
	if (scope) {
		console.log("Added article", names.join("|"));
		normalize(article, match);
		scope.push(article);
		scope.sort(sort);
	} else {
		console.log("Ignored article", names.join("|"));
	}
};

parseUser = function (name, normalize, article) {
	var author = article.author, scope;
	if (!this.User) this.User = {};
	scope = this.User;
	if (!scope[author]) scope[author] = {};
	scope = scope[author];
	if (scope[name] == null) scope[name] = [];
	if (scope[name]) {
		normalize(article);
		scope[name].push(article);
		scope[name].sort(sort);
	} else {
		console.log("Ignored user", name);
	}
};

toHTML = function (str) {
	return str.split('\n').map(function (str) {
		var cls;
		if (startsWith.call(str, '>')) {
			cls = 'email-quoted';
			str = str.slice(1);
		}
		return '<p' + (cls ? ' class="' + cls + '"' : '') +
			'>' + str.replace('/>/g', '&gt;').replace('/>/g', '&lt;')
			.replace('/&/g', '&amp;').replace('/"/g', '&quot;')
			.replace(reURI, function (match) {
				return '<a href="' + match + '">' + match + '</a>';
			}) + '</p>';

	}).join('');
};

titleFromAttr = function (article) {
	var match = article.description
		.match(/<a href="[\0-!#-\uffff]+" title="([\0-!#-\uffff]+)">/);
	if (match) article.headTitle = decode(match[1]);
	else log("Could not parse title", article.description);
};

titleFromBlockquote = function (article) {
	var match = article.description
		.match(/<blockquote>([\0-;=-\uffff]+)<\/blockquote>/);
	if (match) article.headTitle = decode(match[1]);
	else log("Could not parse title from blockquote", article.description);
};

bodyFromAPI = function (article) {
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
		article.description = article.description
			.replace(/<blockquote([\0-\uffff]+)<\/blockquote>/,
				'<blockquote>' + toHTML(obj.body) + '</blockquote>');
		console.log("Updated description from API");
		if (!config.dev) {
			webmake(true);
		}
	};
};

handleOpenIssue = function (article, match) {
	var data;
	fixLinks(article);
	titleFromBlockquote(article);
	if (contains.call(article.title, 'opened issue') ||
			contains.call(article.title, 'opened pull request')) {
		data = match[1].split('/');
		github.issues.getRepoIssue({
			user: data[0],
			repo: data[1],
			number: match[2]
		}, bodyFromAPI(article));
	} else if (contains.call(article.title, 'closed issue') ||
			contains.call(article.title, 'closed pull request')) {
		article.description = article.description
			.replace(/<blockquote>([\0-\uffff]+)<\/blockquote>/, '')
			.replace(' class="details">',
				' class="details" style="display:none">');
	}
};

process = {
	commitcommentevent: partial.call(parse, new RegExp('^https:\\/\\/github\\.' +
		'com\\/([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/commit\\/' +
		'([a-z0-9\\.\\-]+)#([\\0-\\uffff]+)$'), ['Repo', 1, 'Commits'], fixLinks),
	createevent: partial.call(parseUser, 'Created', fixLinks),
	deleteevent: partial.call(parseUser, 'Deleted', fixLinks),
	followevent: partial.call(parseUser, 'Followed', fixLinks),
	forkevent: partial.call(parseUser, 'Forked', fixLinks),
	gistevent: partial.call(parse,
		/\/(\d+)$/,
		['Gist', 1], function (article) {
			var m = article.description
				.match(/div class="message">([\0-;=-\uffff]+)<\/div>/);
			if (m) article.headTitle =  article.author + ': ' + m[1];
			fixLinks(article);
		}),
	gollumevent: partial.call(parse, new RegExp('^https:\\/\\/github\\.com\\/' +
		'([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/wiki\\/([\\0-\\uffff]+)$'),
		['Repo', 1, 'Wiki', 2], fixLinks),
	issuecommentevent: partial.call(parse, new RegExp('^https:\\/\\/github\\.' +
		'com\\/([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/(?:issues|pull)\\/' +
		'(\\d+)#issuecomment-(\\d+)$'), ['Repo', 1, 'Issues & Pull Requests', 2],
		function (article, orgmatch) {
			var data;
			fixLinks(article);
			titleFromAttr(article);
			if (contains.call(article.description, '…</p>')) {
				data = orgmatch[1].split('/');
				github.issues.getComment({
					user: data[0],
					repo: data[1],
					id: orgmatch[3]
				}, bodyFromAPI(article));
			}
		}),
	issuesevent: partial.call(parse, new RegExp('^https:\\/\\/github\\.com\\/' +
		'([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/issues\\/(\\d+)$'),
		['Repo', 1, 'Issues & Pull Requests', 2], handleOpenIssue),
	memberevent: partial.call(parseUser, 'Added members', fixLinks),
	publicevent: partial.call(parseUser, 'Published', fixLinks),
	releaseevent: partial.call(parseUser, 'Released', fixLinks),
	pullrequestevent: partial.call(parse, new RegExp('^https:\\/\\/github\\.' +
		'com\\/([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/pull\\/(\\d+)$'),
		['Repo', 1, 'Issues & Pull Requests', 2], handleOpenIssue),
	pullrequestreviewcommentevent: partial.call(parse, new RegExp('^https:' +
		'\\/\\/github\\.com\\/([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/pull' +
		'\\/(\\d+)#(?:discussion_)?r(\\d+)$'),
		['Repo', 1, 'Issues & Pull Requests', 2], function (article, orgmatch) {
			var data;
			fixLinks(article);
			if (contains.call(article.description, '…</p>')) {
				data = orgmatch[1].split('/');
				github.pullRequests.getComment({
					user: data[0],
					repo: data[1],
					number: orgmatch[3]
				}, bodyFromAPI(article));
			}
		}),
	pushevent: partial.call(parse, new RegExp('^https:\\/\\/github\\.com\\/' +
		'([a-zA-Z0-9_\\.\\-]+\\/[a-zA-Z0-9_\\.\\-]+)\\/compare\\/([a-z0-9\\.]+)$'),
		['Repo', 1, 'Commits'], fixLinks),
	watchevent: partial.call(parseUser, 'Watching', fixLinks)
};

url = 'https://github.com/' + config.user + '.private.atom?token=' +
	config.token;
parser = new Parser(url);
data = {};

module.exports = data;

parser.on('article', function (article) {
	var type = article.guid.match(reType);
	if (!type) {
		log("Article with no guid", article);
		return;
	}
	type = type[1].toLowerCase();

	if (!process[type]) {
		log("Not supported article type", article);
		return;
	}
	process[type].call(data, article);
	if (!config.dev) webmake(true);
});

parser.get();
setInterval(parser.get.bind(parser), 15000);
