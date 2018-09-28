/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const moment = require('../node_modules/moment-timezone/moment-timezone');
const momentDurationFormatSetup = require('../node_modules/moment-duration-format/lib/moment-duration-format');

momentDurationFormatSetup(moment);
moment.tz.load(require('../node_modules/moment-timezone/data/packed/latest.json'));

module.exports = moment;
