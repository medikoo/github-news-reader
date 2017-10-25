"use strict";

let isArray = Array.isArray
  , aFrom   = require("es5-ext/array/from")
  , forEach = require("es5-ext/object/for-each")
  , data    = require("./data")
  , socket  = io.connect(`${ location.protocol }//${ location.host }`)

  , path = [];

forEach(data, function self(value, name, context) {
	path.push(name);
	if (isArray(value)) {
		value.$path = aFrom(path);
		value.forEach(article => {
			article.on("update", e => {
				if (e && (e.type === "read")) {
					socket.emit("read", value.$path.concat(article.guid));
				}
			});
		});

		value.on("ignore", () => {
			socket.emit("ignore", value.$path);
		});
	} else {
		forEach(value, self);
	}
	path.pop();
});
