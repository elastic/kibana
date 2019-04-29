/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import buildVersion from './helpers/build_version';
import gitInfo from './helpers/git_info';

export default (gulp, { log, colors, pkg }) => {
  gulp.task('report', () => {
    return gitInfo()
      .then(function (info) {
        log('Package Name', colors.yellow(pkg.name));
        log('Version', colors.yellow(buildVersion(pkg)));
        log('Build Number', colors.yellow(info.number));
        log('Build SHA', colors.yellow(info.sha));
      });
  });
};
