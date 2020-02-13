/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { createRoot } from '../../src/test_utils/kbn_server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { CliArgs } from '../../src/core/server/config';

/**
 * Creates a root with the specified list of x-pack plugins enabled.
 * @param xpackPlugins list of X-Pack plugins, should match directory name of plugin (eg. task_manager)
 * @param settings
 * @param cliArgs
 */
export function createRootWithXpackPlugins(
  xpackPlugins: string[] = [],
  settings: any = {},
  cliArgs: Partial<CliArgs> = {}
) {
  return createRoot(
    {
      ...settings,
      plugins: {
        ...settings?.plugins,
        paths: xpackPlugins.map(name => resolve(__dirname, `../../x-pack/plugins/${name}`)),
      },
    },
    cliArgs
  );
}
