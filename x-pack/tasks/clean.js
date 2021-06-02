/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import del from 'del';
import gulp from 'gulp';
import log from 'fancy-log';

import { coverageDir, buildDir, packageDir } from './helpers/paths';

export async function cleanTest() {
  log('Deleting', coverageDir);
  await del([coverageDir]);
}

async function cleanDist() {
  const toDelete = [
    buildDir,
    packageDir,
  ];

  log('Deleting', toDelete.join(', '));
  await del(toDelete);
}

export const clean = gulp.series(cleanTest, cleanDist);
