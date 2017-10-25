"use strict";

Error.stackTraceLimit = Infinity;

let resolve      = require("path").resolve
  , createServer = require("http").createServer
  , st           = require("st")
  , config       = require("../env")
  , webmake      = require("./webmake")

  , root = resolve(__dirname, "../")

  , server;

st = st({ path: resolve(root, "public"), index: "index.html" });

server = module.exports = createServer((req, res) => {
	if (config.dev && (req.url === "/j/main.js")) {
		res.writeHead(200, { "Content-Type":
			"application/javascript; charset=utf-8",
			"Cache-Control": "no-cache" });
		webmake().done(res.end.bind(res));
		return;
	}
	st(req, res);
});
server.listen(config.port);

require("./client");
