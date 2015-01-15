'use strict';

var isArray = Array.isArray
  , call    = Function.prototype.call
  , max     = Math.max
  , keys    = Object.keys
  , last    = require('es5-ext/array/#/last')
  , format  = require('es5-ext/date/#/format')
  , pluck   = require('es5-ext/function/pluck')
  , not     = require('es5-ext/function/#/not')
  , count   = require('es5-ext/object/count')
  , toArray = require('es5-ext/object/to-array')
  , memoize = require('memoizee/lib/regular')
  , lcSort  = call.bind(require('es5-ext/string/#/case-insensitive-compare'))
  , domjs   = require('domjs/lib/html5')(document)
  , data    = require('./data')

  , articleDOM;

articleDOM = memoize(function (article) {
	var el, body;
	el = this.li({ class: 'article' },
		!article.skipTitle &&
		this.h2(this.a({ href: article.link, target: '_blank' }, article.title)),
		!article.skipAuthor && this.div({ class: 'author' },
			this.b(article.author), ' at ' +
			format.call(new Date(Date.parse(article.date)), '%Y-%m-%d %H:%M:%S')),
		body = this.div({ class: 'body' })())();
	if (article.description) {
		body.innerHTML = article.description.replace(/<a href=/g, '<a target="_blank" href=')
			.replace('/<script/g', '<scipt');
	} else {
		body.innerHTML = '';
	}
	return el;
}.bind(domjs.map));

document.body.appendChild(domjs.build(function () {
	var nest = 0, container, content, load, selected, fixPadding
	  , offsets = [], current, scope, articles, ignore, reset;

	reset = function () {
		scope = data;
		while (!isArray(scope)) {
			if (!(scope = scope[keys(scope).sort(lcSort)[0]])) return;
		}
		load.call(scope);
	};

	load = function () {
		var els;
		current = this;
		els = this.map(articleDOM);
		articles().innerHTML = '';
		if (!els.length) return;
		articles(els);
		if (!els[0].offsetTop) {
			setTimeout(load.bind(this), 10);
			return;
		}
		this.emit('select');
		this.some(function (el, i) {
			if (!el.read) {
				container.scrollTop = max(els[i].offsetTop - ((i === 0) ? 50 : 20), 0);
				return true;
			}
		});
		offsets = els.map(function (el) { return el.offsetTop + 60; });
	};

	ignore = function () {
		if (current) current.emit('ignore');
	};

	fixPadding = function () {
		content.style.paddingBottom = max(document.body.scrollHeight,
			document.body.offsetHeight,
			document.documentElement.clientHeight,
			document.documentElement.scrollHeight,
			document.documentElement.offsetHeight) + 'px';
	};

	section({ class: 'aside' },
		ul({ class: 'nest-' + nest },
			toArray(data, function self(value, key, context) {
				var el, len;
				if (isArray(value)) {
					el = li({ class: 'feed' }, a({ onclick: load.bind(value) },
						(last.call(value).headTitle || key) + "\u00a0(",
						(len = _text(value.filter(not.call(pluck('read'))).length)),
						")"))();
					value.on('select', function () {
						if (selected) selected.classList.remove('selected');
						el.classList.add('selected');
						selected = el;
					});
					value.on('update', function () {
						var rlen = this.filter(not.call(pluck('read'))).length;
						len.data = rlen;
						if (!rlen) el.parentNode.removeChild(el);
					});
					value.on('ignore', function () {
						if (el.parentNode) el.parentNode.removeChild(el);
						reset();
					});
				} else {
					el = li(h3(key), ul({ class: 'nest-' + (++nest) },
						toArray(value, self, null, lcSort)))();
					--nest;
					value.on('update', function () {
						if (!count(this) && el.parentNode) el.parentNode.removeChild(el);
					});
				}
				return el;
			}, null, lcSort)));
	container = section({ class: 'content' },
		content = div(
			p({ class: 'controls' },
				input({ type: 'button', value: 'Unsubscribe', onclick: ignore })),
			articles = ul(),
			p({ class: 'controls' },
				input({ type: 'button', value: 'Unsubscribe', onclick: ignore }))
		)())();

	fixPadding();
	window.onresize = fixPadding;

	container.onscroll = function () {
		var pos = container.scrollTop;
		offsets.every(function (offset, i) {
			if (pos > offset) {
				current[i].markRead();
				return true;
			}
		});
	};

	// Show first
	reset();

}));
