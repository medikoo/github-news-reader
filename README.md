# Github News Reader

_Rough quick implementation for own purposes, tested with Node v4 and Google Chrome browser_

Groups articles into relative subjects and provides Google Reader like interface.
Individual sections can be unsubscribed.

## Installation

Download and setup application:

	$ git clone https://github.com/medikoo/github-news-reader.git
	$ cd github-news-reader
	$ npm install

Create `config.json` in project path with following settings:

* `port` - Port for application server
* `username` - Your GitHub username
* `token` - Find it in your news feed url

Start server:

	$ npm start

Wait for _Client application updated_ message and enjoy your News Reader on configured port
