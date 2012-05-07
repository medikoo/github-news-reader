# Github News Reader

_Rough quick implementation for own purposes, tested with Node v0.6 and Google Chrome browser_

Groups articles into relative subjects and provides Google Reader like interface.
Individual sections can be unsubscribed.

## Installation

	$ git clone https://github.com/medikoo/github-news-reader.git
	$ npm install
	$ npm run-script setup

Create `config.json` in project path with following settings:

* `port` - Port on which application server should listen
* `username` - Your github username
* `token` - Copy it from your news feed url

	$ npm start
