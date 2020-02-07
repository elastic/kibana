/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import pluginHelpers from '@kbn/plugin-helpers';
import gulp from 'gulp';

import { getEnabledPlugins } from './helpers/flags';

export const testServerTask = async () => {
  throw new Error('server mocha tests are now included in the `node scripts/mocha` script');
};

export const testBrowserTask = async () => {
  const plugins = await getEnabledPlugins();
  await pluginHelpers.run('testBrowser', {
    plugins: plugins.join(','),
  });
};

export const testBrowserDevTask = async () => {
  const plugins = await getEnabledPlugins();
  await pluginHelpers.run('testBrowser', {
    dev: true,
    plugins: plugins.join(','),
  });
};

export const testTask = gulp.series(testBrowserTask, testServerTask);
