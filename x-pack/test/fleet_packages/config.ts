/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export const BUNDLED_PACKAGE_DIR = '/tmp/fleet_bundled_packages';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    testFiles: [require.resolve('./tests')],
    servers: xPackAPITestsConfig.get('servers'),
    services: xPackAPITestsConfig.get('services'),
    junit: {
      reportName: 'X-Pack Fleet packages tests',
    },
    esTestCluster: xPackAPITestsConfig.get('esTestCluster'),
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.cloudSecurityPosture.enabled=true',
        // Enable debug fleet logs by default
        `--logging.loggers[0].name=plugins.fleet`,
        `--logging.loggers[0].level=debug`,
        `--logging.loggers[0].appenders=${JSON.stringify(['default'])}`,
      ],
    },
  };
}
