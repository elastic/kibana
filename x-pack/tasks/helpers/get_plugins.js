/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import yargs from 'yargs';
import glob from 'glob';
import { toArray } from 'rxjs/operators';
import { findPluginSpecs } from '../../../src/legacy/plugin_discovery';

/*
  Usage:
    Specifying which plugins to run tests can be done with the --plugins flag.
    One of more plugins can be specified, and each one should be command separated, like so:
      gulp testserver --plugins monitoring,reporting
    If using with yarn:
      yarn test:server --plugins graph
*/

const argv = yargs
  .describe('plugins', 'Comma-separated list of plugins')
  .argv;
const allPlugins = glob.sync('*', { cwd: resolve(__dirname, '..', '..', 'legacy', 'plugins') });

export function getPlugins() {
  const plugins = argv.plugins && argv.plugins.split(',');
  if (!Array.isArray(plugins) || plugins.length === 0) {
    return allPlugins;
  }
  return plugins;
}

const { spec$ } = findPluginSpecs({
  plugins: { paths: [resolve(__dirname, '..', '..')] }
});

export async function getEnabledPlugins() {
  const plugins = argv.plugins && argv.plugins.split(',');
  if (!Array.isArray(plugins) || plugins.length === 0) {
    const enabledPlugins = await spec$.pipe(toArray()).toPromise();
    return enabledPlugins.map(spec => spec.getId());
  }
  return plugins;
}
