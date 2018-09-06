/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { ensureAllBrowsersDownloaded } = require('../plugins/reporting/server/browsers');

module.exports = gulp => {
  // anything that needs to happen pre-build or pre-dev
  gulp.task('prepare', () => ensureAllBrowsersDownloaded());
};
