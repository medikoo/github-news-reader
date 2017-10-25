/* eslint no-console: "off" */

"use strict";

const logger = require("log4");

const levelMap = {
	debug: "log",
	error: "error",
	info: "info",
	warning: "warn"
};

logger.emitter.on("log", logEvent => {
	const currentLogger = logEvent.logger;
	console[levelMap[currentLogger.level] || "log"](
		...[`[${ currentLogger.ns }]`].concat(logEvent.messageTokens)
	);
});
