'use strict';

var start = require('./forever-start')
  , stop  = require('./forever-stop');

module.exports = function () {
	return stop()(start);
};
