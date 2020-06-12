/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import fs from 'fs';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const integrationConfig = await readConfigFile(require.resolve('../api_integration/config'));

  // Find all folders in ./plugins since we treat all them as plugin folder
  const allFiles = fs.readdirSync(path.resolve(__dirname, 'plugins'));
  const plugins = allFiles.filter((file) =>
    fs.statSync(path.resolve(__dirname, 'plugins', file)).isDirectory()
  );

  return {
    testFiles: [
      require.resolve('./test_suites/task_manager'),
      require.resolve('./test_suites/event_log'),
      require.resolve('./test_suites/licensed_feature_usage'),
    ],
    services,
    servers: integrationConfig.get('servers'),
    esTestCluster: integrationConfig.get('esTestCluster'),
    apps: integrationConfig.get('apps'),
    esArchiver: {
      directory: path.resolve(__dirname, '../functional/es_archives'),
    },
    screenshots: integrationConfig.get('screenshots'),
    junit: {
      reportName: 'Plugin Functional Tests',
    },
    kbnTestServer: {
      ...integrationConfig.get('kbnTestServer'),
      serverArgs: [
        ...integrationConfig.get('kbnTestServer.serverArgs'),
        '--xpack.eventLog.enabled=true',
        '--xpack.eventLog.logEntries=true',
        '--xpack.eventLog.indexEntries=true',
        ...plugins.map(
          (pluginDir) => `--plugin-path=${path.resolve(__dirname, 'plugins', pluginDir)}`
        ),
      ],
    },
  };
}
