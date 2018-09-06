/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const runSequence = require('run-sequence');
const pluginHelpers = require('@kbn/plugin-helpers');
const { getEnabledPlugins } = require('./helpers/get_plugins');
const fileGlobs = require('./helpers/globs');
const { createAutoJUnitReporter } = require('../../src/dev');

const MOCHA_OPTIONS = {
  ui: 'bdd',
  reporter: createAutoJUnitReporter({
    reportName: 'X-Pack Mocha Tests',
    rootDirectory: __dirname,
  }),
};

module.exports = (gulp, { mocha }) => {
  gulp.task('test', (cb) => {
    const preTasks = ['clean-test'];
    runSequence(preTasks, 'testserver', 'testbrowser', cb);
  });

  gulp.task('testonly', ['testserver', 'testbrowser']);

  gulp.task('testserver', () => {
    const globs = [
      'common/**/__tests__/**/*.js',
      'server/**/__tests__/**/*.js',
    ].concat(fileGlobs.forPluginServerTests());

    return gulp.src(globs, { read: false })
      .pipe(mocha(MOCHA_OPTIONS));
  });

  gulp.task('testbrowser', () => {
    return getEnabledPlugins().then(plugins => {
      return pluginHelpers.run('testBrowser', {
        plugins: plugins.join(','),
      });
    });
  });

  gulp.task('testbrowser-dev', () => {
    return getEnabledPlugins().then(plugins => {
      return pluginHelpers.run('testBrowser', {
        dev: true,
        plugins: plugins.join(','),
      });
    });
  });
};