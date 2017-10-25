"use strict";

const aFrom   = require("es5-ext/array/from")
    , forEach = require("es5-ext/object/for-each")
    , data    = require("./data")
    , socket  = io.connect(`${ location.protocol }//${ location.host }`);

const { isArray } = Array, path = [];

forEach(data, function processItem(value, itemName) {
	path.push(itemName);
	if (isArray(value)) {
		value.$path = aFrom(path);
		value.forEach(article => {
			article.on("update", e => {
				if (e && e.type === "read") {
					socket.emit("read", value.$path.concat(article.guid));
				}
			});
		});

		value.on("ignore", () => {
			socket.emit("ignore", value.$path);
		});
	} else {
		forEach(value, processItem);
	}
	path.pop();
});
