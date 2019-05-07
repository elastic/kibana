/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import fs from 'fs';

export default async function ({ readConfigFile }) {
  const integrationConfig = await readConfigFile(require.resolve('../api_integration/config'));
  const kibanaFunctionalConfig = await readConfigFile(require.resolve('../../../test/functional/config.js'));

  // Find all folders in ./plugins since we treat all them as plugin folder
  const allFiles = fs.readdirSync(path.resolve(__dirname, 'plugins'));
  const plugins = allFiles.filter(file => fs.statSync(path.resolve(__dirname, 'plugins', file)).isDirectory());

  return {
    testFiles: [
      require.resolve('./test_suites/task_manager'),
      require.resolve('./test_suites/encrypted_saved_objects'),
    ],
    services: {
      retry: kibanaFunctionalConfig.get('services.retry'),
      ...integrationConfig.get('services'),
    },
    pageObjects: integrationConfig.get('pageObjects'),
    servers: integrationConfig.get('servers'),
    esTestCluster: integrationConfig.get('esTestCluster'),
    apps: integrationConfig.get('apps'),
    esArchiver: {
      directory: path.resolve(__dirname, '../es_archives')
    },
    screenshots: integrationConfig.get('screenshots'),
    junit: {
      reportName: 'Plugin Functional Tests',
    },
    kbnTestServer: {
      ...integrationConfig.get('kbnTestServer'),
      serverArgs: [
        ...integrationConfig.get('kbnTestServer.serverArgs'),
        ...plugins.map(pluginDir => `--plugin-path=${path.resolve(__dirname, 'plugins', pluginDir)}`),
      ],
    },
  };
}

