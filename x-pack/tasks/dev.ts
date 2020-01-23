/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import pluginHelpers from '@kbn/plugin-helpers';
import gulp from 'gulp';

import { prepareTask } from './prepare';

export const devTask = gulp.series(prepareTask, async function startKibanaServer() {
  await pluginHelpers.run('start', {
    flags: process.argv.slice(3),
  });
});
