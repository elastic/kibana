/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const pluginHelpers = require('@kbn/plugin-helpers');
const getFlags = require('./helpers/get_flags');

module.exports = (gulp) => {
  gulp.task('dev', ['prepare'], () => pluginHelpers.run('start', { flags: getFlags() }));
};
