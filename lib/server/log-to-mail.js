'use strict';

var config   = require('../../config')

  , mailer, subjectPrefix;

if (config.devMail) {
	mailer = require('nodemailer').createTransport('SMTP', config.devMail);
	if (config.devMail.subject) {
		subjectPrefix = config.devMail.subject + ': ';
	} else {
		subjectPrefix = '';
	}
}


module.exports = function (subject, body) {
	var opts;
	if (mailer) {
		mailer.sendMail({
			from: config.devMail.from,
			to: config.devMail.to,
			subject: subjectPrefix + subject,
			body: body
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
