/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import pluginHelpers from '@kbn/plugin-helpers';
// @ts-ignore
import { createAutoJUnitReporter } from '@kbn/test';
// @ts-ignore
import mocha from 'gulp-mocha';
import gulp from 'gulp';

import { getEnabledPlugins } from './helpers/flags';

export const testServerTask = async () => {
  const pluginIds = await getEnabledPlugins();

  const testGlobs = ['common/**/__tests__/**/*.js', 'server/**/__tests__/**/*.js'];

  if (pluginIds.includes('code')) {
    testGlobs.push(`legacy/plugins/**/server/**/__tests__/**/*.ts`);
  }

  for (const pluginId of pluginIds) {
    testGlobs.push(
      `legacy/plugins/${pluginId}/__tests__/**/*.js`,
      `legacy/plugins/${pluginId}/common/**/__tests__/**/*.js`,
      `legacy/plugins/${pluginId}/**/server/**/__tests__/**/*.js`
    );
  }

  return gulp.src(testGlobs, { read: false }).pipe(
    mocha({
      ui: 'bdd',
      require: require.resolve('../../src/setup_node_env'),
      reporter: createAutoJUnitReporter({
        reportName: 'X-Pack Mocha Tests',
      }),
    })
  );
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

export const testTask = gulp.series(testServerTask, testBrowserTask);
