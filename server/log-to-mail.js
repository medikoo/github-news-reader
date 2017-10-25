"use strict";

const log    = require("log4").getNs("github-news-reader")
    , config = require("../env");

let mailer, subjectPrefix;

if (config.devMail) {
	mailer = require("nodemailer").createTransport(config.devMail);
	if (config.devMail.subject) {
		subjectPrefix = `${ config.devMail.subject }: `;
	} else {
		subjectPrefix = "";
	}
}

module.exports = function (subject, body) {
	if (mailer) {
		mailer.sendMail(
			{
				from: config.devMail.from,
				to: config.devMail.to,
				subject: subjectPrefix + subject,
				text: body
			},
			err => {
				if (err) {
					log.error(`Could not send email: ${ err }`);
					log.error(`${ subject }: ${ body }`);
					return;
				}
				log("Email succesfully sent", subject, body);
			}
		);
	} else {
		log.error(`${ subject }: ${ body }`);
	}
};
