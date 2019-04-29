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
export function forPluginServerTests() {
  return getPlugins().reduce((paths, pluginName) => {
    const plugin = pluginName.trim();
    return [
      ...paths,

      // index and helpers
      `plugins/${plugin}/__tests__/**/*.js`,

      // only include tests in the root common directory
      `plugins/${plugin}/common/**/__tests__/**/*.js`,

      // include tests in any server directory
      `plugins/${plugin}/**/server/**/__tests__/**/*.js`,

      // custom paths for canvas
      ...(plugin === 'canvas' ? ['plugins/canvas/canvas_plugin_src/**/__tests__/**/*.js'] : []),
    ];
  }, []);
}
