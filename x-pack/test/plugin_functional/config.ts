/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { resolve } from 'path';
import fs from 'fs';
import { KIBANA_ROOT } from '@kbn/test';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services } from './services';
import { pageObjects } from './page_objects';

// the default export of config files must be a config provider
// that returns an object with the projects config values

/* eslint-disable import/no-default-export */
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../security_solution_endpoint/config.ts')
  );

  // Find all folders in ./plugins since we treat all them as plugin folder
  const allFiles = fs.readdirSync(resolve(__dirname, 'plugins'));
  const plugins = allFiles.filter((file) =>
    fs.statSync(resolve(__dirname, 'plugins', file)).isDirectory()
  );

  return {
    // list paths to the files that contain your plugins tests
    testFiles: [
      resolve(__dirname, './test_suites/audit_trail'),
      resolve(__dirname, './test_suites/resolver'),
      resolve(__dirname, './test_suites/global_search'),
    ],

    services,
    pageObjects,

    servers: xpackFunctionalConfig.get('servers'),

    esTestCluster: xpackFunctionalConfig.get('esTestCluster'),

    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        ...plugins.map((pluginDir) => `--plugin-path=${resolve(__dirname, 'plugins', pluginDir)}`),
        `--plugin-path=${resolve(
          KIBANA_ROOT,
          'test/plugin_functional/plugins/core_provider_plugin'
        )}`,
        // Required to load new platform plugins via `--plugin-path` flag.
        '--env.name=development',

        '--xpack.audit_trail.enabled=true',
        '--xpack.audit_trail.logger.enabled=true',
        '--xpack.audit_trail.appender.kind=file',
        '--xpack.audit_trail.appender.path=x-pack/test/plugin_functional/plugins/audit_trail_test/server/pattern_debug.log',
        '--xpack.audit_trail.appender.layout.kind=json',
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
        pathname: '/app/resolver_test',
      },
    },

    // choose where esArchiver should load archives from
    esArchiver: {
      directory: resolve(__dirname, 'es_archives'),
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
