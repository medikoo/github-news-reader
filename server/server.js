"use strict";

Error.stackTraceLimit = Infinity;

const { resolve }      = require("path")
    , { createServer } = require("http")
    , st               = require("st")
    , config           = require("../env")
    , webmake          = require("./webmake");

const rootPath = resolve(__dirname, "../")
    , stMiddleware = st({ path: resolve(rootPath, "public"), index: "index.html" });

const server = module.exports = createServer((req, res) => {
	if (config.dev && req.url === "/j/main.js") {
		res.writeHead(200, {
			"Content-Type": "application/javascript; charset=utf-8",
			"Cache-Control": "no-cache"
		});
		webmake().done(res.end.bind(res));
		return;
	}
	stMiddleware(req, res);
});
server.listen(config.port);

require("./client");
