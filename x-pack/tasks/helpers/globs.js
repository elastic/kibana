/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPlugins } from './get_plugins';

/*
 * Note: The path `plugins / pluginName / ** / __tests__ / ** / *.js` will match
 * all public and server tests, so a special var must be used for "index" tests
 * paths: `plugins / pluginName / __tests__ / ** / *.js`
 */
function getPluginPaths(plugins, opts = {}) {
  const testPath = opts.tests ? '__tests__/**' : '';

  return plugins.reduce((paths, pluginName) => {
    const plugin = pluginName.trim();
    const commonPath = `${plugin}/common`;
    const serverPath = `${plugin}/**/server`;
    const publicPath = `${plugin}/**/public`;

    const indexPaths = `plugins/${plugin}/${testPath}/*.js`; // index and helpers
    const commonPaths = `plugins/${commonPath}/**/${testPath}/*.js`;
    const serverPaths = `plugins/${serverPath}/**/${testPath}/*.js`;
    const publicPaths = `plugins/${publicPath}/**/${testPath}/*.js`;

    paths = paths.concat([indexPaths, commonPaths, serverPaths]);
    if(plugin === 'code') {
      paths.push(`plugins/${serverPath}/**/${testPath}/*.ts`);
    }
    if (opts.browser) {
      paths = paths.concat(publicPaths);
    }

    return paths;
  }, []);
}

export function forPlugins() {
  const plugins = getPlugins();
  return getPluginPaths(plugins, { browser: true });
}

export function forPluginServerTests() {
  const plugins = getPlugins();
  return getPluginPaths(plugins, { tests: true });
}
