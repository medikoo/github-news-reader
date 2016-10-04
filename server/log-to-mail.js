'use strict';

var config   = require('../env')

  , mailer, subjectPrefix;

if (config.devMail) {
	mailer = require('nodemailer').createTransport(config.devMail);
	if (config.devMail.subject) {
		subjectPrefix = config.devMail.subject + ': ';
	} else {
		subjectPrefix = '';
	}
}

module.exports = function (subject, body) {
	if (mailer) {
		mailer.sendMail({
			from: config.devMail.from,
			to: config.devMail.to,
			subject: subjectPrefix + subject,
			text: body
		}, function (err, response) {
			if (err) {
				console.error("Could not send email: " + err);
				console.error(subject + ": " + body);
				return;
			}
			console.log("Email succesfully sent", subject, body);
		});
	} else {
		console.error(subject + ": " + body);
	}
};
