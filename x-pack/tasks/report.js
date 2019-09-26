/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import buildVersion from './helpers/build_version';
import gitInfo from './helpers/git_info';
import chalk from 'chalk';

export default (gulp, { log, pkg }) => {
  gulp.task('report', () => {
    return gitInfo()
      .then(function (info) {
        log('Package Name', chalk.yellow(pkg.name));
        log('Version', chalk.yellow(buildVersion(pkg)));
        log('Build Number', chalk.yellow(info.number));
        log('Build SHA', chalk.yellow(info.sha));
      });
  });
};
