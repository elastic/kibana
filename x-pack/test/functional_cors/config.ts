/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Url from 'url';
import Path from 'path';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';
import { kbnTestConfig } from '@kbn/test';
import { pageObjects } from '../functional/page_objects';

const pluginPort = process.env.TEST_CORS_SERVER_PORT
  ? parseInt(process.env.TEST_CORS_SERVER_PORT, 10)
  : 5699;

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  const corsTestPlugin = Path.resolve(__dirname, './plugins/kibana_cors_test');

  const servers = {
    ...kibanaFunctionalConfig.get('servers'),
    elasticsearch: {
      ...kibanaFunctionalConfig.get('servers.elasticsearch'),
    },
    kibana: {
      ...kibanaFunctionalConfig.get('servers.kibana'),
    },
  };

  const { protocol, hostname } = kbnTestConfig.getUrlParts();
  const originUrl = Url.format({
    protocol,
    hostname,
    port: pluginPort,
  });

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    testFiles: [require.resolve('./tests')],
    servers,
    services: kibanaFunctionalConfig.get('services'),
    pageObjects,
    junit: {
      reportName: 'Kibana CORS with X-Pack Security',
    },

    esTestCluster: kibanaFunctionalConfig.get('esTestCluster'),
    apps: {
      ...kibanaFunctionalConfig.get('apps'),
    },

    kbnTestServer: {
      ...kibanaFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaFunctionalConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${corsTestPlugin}`,
        `--test.cors.port=${pluginPort}`,
        '--server.cors.enabled=true',
        '--server.cors.allowCredentials=true',
        `--server.cors.allowOrigin=["${originUrl}"]`,
      ],
    },
  };
}
