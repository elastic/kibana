/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ensureAllBrowsersDownloaded } from '../legacy/plugins/reporting/server/browsers';

export default gulp => {
  // anything that should always happen before anything else
  gulp.task('prepare', () => ensureAllBrowsersDownloaded());

  // anything that needs to happen before development
  gulp.task('prepare:dev', ['prepare']);

  // anything that needs to happen before building
  gulp.task('prepare:build', ['prepare']);
};
