/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import del from 'del';

export default (gulp, { coverageDir, buildDir, packageDir, log }) => {
  gulp.task('clean-test', () => {
    log('Deleting', coverageDir);
    return del([coverageDir]);
  });

  gulp.task('clean', ['clean-test'], () => {
    const toDelete = [
      buildDir,
      packageDir,
    ];
    log('Deleting', toDelete.join(', '));
    return del(toDelete);
  });
};
