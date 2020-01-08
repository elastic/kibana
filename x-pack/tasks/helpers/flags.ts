/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

import log from 'fancy-log';
import getopts from 'getopts';
import { toArray } from 'rxjs/operators';

// @ts-ignore complicated module doesn't have types yet
import { findPluginSpecs } from '../../../src/legacy/plugin_discovery';

/*
  Usage:
    Specifying which plugins to run tests can be done with the --plugins flag.
    One of more plugins can be specified, and each one should be command separated, like so:
      gulp testserver --plugins monitoring,reporting
    If using with yarn:
      yarn test:server --plugins graph
*/

const opts = Object.freeze(
  getopts(process.argv.slice(2), {
    alias: {
      release: 'r',
    },
    boolean: ['release', 'flags'],
    string: ['build-qualifier', 'plugins'],
  })
);

if (opts.flags) {
  log(`
  X-Pack Gulpfile Flags:

    --flags            Print this message
    --plugins          Comma-separated list of plugins
    --release, -r      Build to a release version
    --build-qualifier  Qualifier to include in the build version
  `);
  process.exit(0);
}

export const FLAGS = {
  release: !!opts.release,
  buildQualifier: opts.buildQualifier as string | undefined,
  plugins: opts.plugins
    ? String(opts.plugins)
        .split(',')
        .map(id => id.trim())
    : undefined,
};

export async function getEnabledPlugins() {
  if (FLAGS.plugins) {
    return FLAGS.plugins;
  }

  const { spec$ } = findPluginSpecs({
    plugins: {
      paths: [resolve(__dirname, '..', '..')],
    },
  });

  const enabledPlugins: Array<{ getId: () => string }> = await spec$.pipe(toArray()).toPromise();
  return enabledPlugins.map(spec => spec.getId());
}
