/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gulp from 'gulp';
import pluginHelpers from '@kbn/plugin-helpers';

import getFlags from './helpers/get_flags';
import { prepare } from './prepare';

async function pluginHelpersStart() {
  await pluginHelpers.run('start', { flags: getFlags() });
}

export const dev = gulp.series(prepare, pluginHelpersStart);

