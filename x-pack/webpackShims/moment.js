/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const moment = module.exports = require('../node_modules/moment/min/moment.min.js');
const momentDurationFormatSetup = require('../node_modules/moment-duration-format/lib/moment-duration-format');
momentDurationFormatSetup(moment);
