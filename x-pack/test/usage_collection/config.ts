/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import fs from 'fs';
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';
import { pageObjects } from './page_objects';

// the default export of config files must be a config provider
// that returns an object with the projects config values

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  // Find all folders in ./plugins since we treat all them as plugin folder
  const allFiles = fs.readdirSync(resolve(__dirname, 'plugins'));
  const plugins = allFiles.filter((file) =>
    fs.statSync(resolve(__dirname, 'plugins', file)).isDirectory()
  );

  return {
    ...xpackFunctionalConfig.getAll(),
    // list paths to the files that contain your plugins tests
    testFiles: [
      resolve(__dirname, './test_suites/application_usage'),
      resolve(__dirname, './test_suites/stack_management_usage'),
    ],

    services,
    pageObjects,

    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        ...plugins.map((pluginDir) => `--plugin-path=${resolve(__dirname, 'plugins', pluginDir)}`),
      ],
    },

    junit: {
      reportName: 'X-Pack Usage Collection Functional Tests',
    },
  };
}
