/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import fs from 'fs';
// @ts-expect-error https://github.com/elastic/kibana/issues/95679
import { KIBANA_ROOT } from '@kbn/test';
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';
import { pageObjects } from './page_objects';

// the default export of config files must be a config provider
// that returns an object with the projects config values

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(require.resolve('../functional/config.js'));

  // Find all folders in ./plugins since we treat all them as plugin folder
  const allFiles = fs.readdirSync(resolve(__dirname, 'plugins'));
  const plugins = allFiles.filter((file) =>
    fs.statSync(resolve(__dirname, 'plugins', file)).isDirectory()
  );

  return {
    // list paths to the files that contain your plugins tests
    testFiles: [
      resolve(__dirname, './test_suites/resolver'),
      resolve(__dirname, './test_suites/global_search'),
      resolve(__dirname, './test_suites/timelines'),
    ],

    services,
    pageObjects,

    servers: xpackFunctionalConfig.get('servers'),

    esTestCluster: xpackFunctionalConfig.get('esTestCluster'),

    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${resolve(
          KIBANA_ROOT,
          'test/plugin_functional/plugins/core_provider_plugin'
        )}`,
        ...plugins.map((pluginDir) => `--plugin-path=${resolve(__dirname, 'plugins', pluginDir)}`),
      ],
    },
    uiSettings: xpackFunctionalConfig.get('uiSettings'),
    // the apps section defines the urls that
    // `PageObjects.common.navigateTo(appKey)` will use.
    // Merge urls for your plugin with the urls defined in
    // Kibana's config in order to use this helper
    apps: {
      ...xpackFunctionalConfig.get('apps'),
      resolverTest: {
        pathname: '/app/resolverTest',
      },
      timelineTest: {
        pathname: '/app/timelinesTest',
      },
    },

    // choose where screenshots should be saved
    screenshots: {
      directory: resolve(__dirname, 'screenshots'),
    },

    junit: {
      reportName: 'Chrome X-Pack UI Plugin Functional Tests',
    },
  };
}
