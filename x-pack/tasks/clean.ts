/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import del from 'del';
import gulp from 'gulp';
import log from 'fancy-log';

import { coverageDir, buildDir, packageDir } from '../constants';

export const cleanCoverageTask = async () => {
  log('Deleting', coverageDir);
  await del([coverageDir]);
};

export const cleanBuildTask = async () => {
  const toDelete = [buildDir, packageDir];
  log('Deleting', toDelete.join(', '));
  await del(toDelete);
};

export const cleanTask = gulp.parallel(cleanBuildTask, cleanCoverageTask);
