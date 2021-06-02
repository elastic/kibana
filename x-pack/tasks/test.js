/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import pluginHelpers from '@kbn/plugin-helpers';
import gulp from 'gulp';
import mocha from 'gulp-mocha';

import { createAutoJUnitReporter } from '../../src/dev';

import { getEnabledPlugins } from './helpers/get_plugins';
import { forPluginServerTests } from './helpers/globs';
import { cleanTest } from './clean';

const MOCHA_OPTIONS = {
  ui: 'bdd',
  reporter: createAutoJUnitReporter({
    reportName: 'X-Pack Mocha Tests',
  }),
};

export function testserver() {
  const globs = [
    'common/**/__tests__/**/*.js',
    'server/**/__tests__/**/*.js',
  ].concat(forPluginServerTests());

  return gulp.src(globs, { read: false })
    .pipe(mocha(MOCHA_OPTIONS));
}

export async function testbrowser() {
  const plugins = await getEnabledPlugins();

  await pluginHelpers.run('testBrowser', {
    plugins: plugins.join(','),
  });
}

export async function testbrowserDev() {
  const plugins = await getEnabledPlugins();

  await pluginHelpers.run('testBrowser', {
    dev: true,
    plugins: plugins.join(','),
  });
}

export const testonly = gulp.series(testserver, testbrowser);
export const test = gulp.series(cleanTest, testserver, testbrowser);
