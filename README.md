# Github News Reader

_Rough quick implementation for own purposes, tested with Node v0.6 and Google Chrome browser_

Groups articles into relative subjects and provides Google Reader like interface.
Individual sections can be unsubscribed.

## Installation

Download and setup application:

	$ git clone https://github.com/medikoo/github-news-reader.git
	$ cd github-news-reader
	$ npm install
	$ npm run-script setup

Create `config.json` in project path with following settings:

* `port` - Port on which application server should listen
* `username` - Your GitHub username
* `token` - Find it in your news feed url

Start server:

	$ npm start
