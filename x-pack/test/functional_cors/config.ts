/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Url from 'url';
import Path from 'path';
import getPort from 'get-port';
import type { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { kbnTestConfig } from '@kbn/test';
import { pageObjects } from '../functional/page_objects';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaFunctionalConfig = await readConfigFile(require.resolve('../functional/config.js'));

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
  const pluginPort = await getPort({ port: 9000 });
  const originUrl = Url.format({
    protocol,
    hostname,
    port: pluginPort,
  });

  return {
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
        '--server.cors.credentials=true',
        `--server.cors.origin=["${originUrl}"]`,
      ],
    },
  };
}
