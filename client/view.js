"use strict";

const last     = require("es5-ext/array/#/last")
    , format   = require("es5-ext/date/#/format")
    , pluck    = require("es5-ext/function/pluck")
    , not      = require("es5-ext/function/#/not")
    , count    = require("es5-ext/object/count")
    , toArray  = require("es5-ext/object/to-array")
    , memoize  = require("memoizee")
    , { call } = Function.prototype
    , lcSort   = call.bind(require("es5-ext/string/#/case-insensitive-compare"))
    , domjs    = require("domjs")(document)
    , data     = require("./data");

const { isArray } = Array, { max } = Math, { keys } = Object;

const articleDOM = memoize(
	function (article) {
		let body;
		const el = this.li(
			{ class: "article" },
			(!article.skipTitle || null) &&
				this.h2(this.a({ href: article.link, target: "_blank" }, article.title)),
			(!article.skipAuthor || null) &&
				this.div(
					{ class: "author" },
					this.b(article.author),
					` at ${ format.call(new Date(Date.parse(article.date)), "%Y-%m-%d %H:%M:%S") }`
				),
			body = this.div({ class: "body" })
		);
		if (article.description) {
			body.innerHTML = article.description
				.replace(/<a href=/g, "<a target=\"_blank\" href=")
				.replace("/<script/g", "<scipt");
		} else {
			body.innerHTML = "";
		}
		return el;
	}.bind(domjs.ns)
);

document.body.appendChild(
	domjs.collect(
		function () {
			let nest = 0, content, selected, offsets = [], current, scope, articles;

			const ignore = function () {
				if (current) current.emit("ignore");
			};

			const container = this.section(
				{ class: "content" },
				content = this.div(
					this.p(
						{ class: "controls" },
						this.input({ type: "button", value: "Unsubscribe", onclick: ignore })
					),
					articles = this.ul(),
					this.p(
						{ class: "controls" },
						this.input({ type: "button", value: "Unsubscribe", onclick: ignore })
					)
				)
			);

			const load = function () {
				current = this;
				const els = this.map(articleDOM);
				articles.innerHTML = "";
				if (!els.length) return;
				articles.extend(els);
				if (!els[0].offsetTop) {
					setTimeout(load.bind(this), 10);
					return;
				}
				this.emit("select");
				this.some((el, i) => {
					if (el.read) return false;
					container.scrollTop = max(els[i].offsetTop - (i === 0 ? 50 : 20), 0);
					return true;
				});
				offsets = els.map(el => el.offsetTop + 60);
			};

			const reset = function () {
				scope = data;
				while (!isArray(scope)) {
					if (!(scope = scope[keys(scope).sort(lcSort)[0]])) return;
				}
				load.call(scope);
			};

			const fixPadding = function () {
				content.style.paddingBottom = `${ max(
					document.body.scrollHeight,
					document.body.offsetHeight,
					document.documentElement.clientHeight,
					document.documentElement.scrollHeight,
					document.documentElement.offsetHeight
				) }px`;
			};

			this.section(
				{ class: "aside" },
				this.ul(
					{ class: `nest-${ nest }` },
					toArray(
						data,
						function processItem(value, key) {
							let el, len;
							if (isArray(value)) {
								el = this.li(
									{ class: "feed" },
									this.a(
										{ onclick: load.bind(value) },
										`${ last.call(value).headTitle || key }\u00a0(`,
										len = this.text(
											value.filter(not.call(pluck("read"))).length
										),
										")"
									)
								);
								value.on("select", () => {
									if (selected) selected.classList.remove("selected");
									el.classList.add("selected");
									selected = el;
								});
								value.on("update", function () {
									const rlen = this.filter(not.call(pluck("read"))).length;
									len.data = rlen;
									if (!rlen && el.parentNode) el.parentNode.removeChild(el);
								});
								value.on("ignore", () => {
									if (el.parentNode) el.parentNode.removeChild(el);
									reset();
								});
							} else {
								el = this.li(
									this.h3(key),
									this.ul(
										{ class: `nest-${ ++nest }` },
										toArray(value, processItem, this, lcSort)
									)
								);
								--nest;
								value.on("update", function () {
									if (!count(this) && el.parentNode) {
										el.parentNode.removeChild(el);
									}
								});
							}
							return el;
						},
						this,
						lcSort
					)
				)
			);

			fixPadding();
			window.onresize = fixPadding;

			container.onscroll = function () {
				const pos = container.scrollTop;
				offsets.every((offset, i) => {
					if (pos <= offset) return false;
					current[i].markRead();
					return true;
				});
			};

			// Show first
			reset();
		}.bind(domjs.ns)
	)
);
