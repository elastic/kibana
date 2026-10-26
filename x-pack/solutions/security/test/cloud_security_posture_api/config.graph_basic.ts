/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { resolve } from 'path';
import { getKibanaCliLoggers, type FtrConfigProviderContext } from '@kbn/test';
import { CLOUD_SECURITY_PLUGIN_VERSION } from '@kbn/cloud-security-posture-common';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack-platform/api_integration/config')
  );

  return {
    ...xPackAPITestsConfig.getAll(),
    testFiles: [resolve(__dirname, './routes/graph_basic')],
    junit: {
      reportName: 'X-Pack Cloud Security Posture API Tests - Graph Basic License',
    },
    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      license: 'basic',
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.license.self_generated.type=basic',
      ],
    },
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--logging.loggers=${JSON.stringify([
          ...getKibanaCliLoggers(xPackAPITestsConfig.get('kbnTestServer.serverArgs')),
          {
            name: 'plugins.cloudSecurityPosture',
            level: 'all',
            appenders: ['default'],
          },
        ])}`,
        `--xpack.fleet.packages.0.name=cloud_security_posture`,
        `--xpack.fleet.packages.0.version=${CLOUD_SECURITY_PLUGIN_VERSION}`,
      ],
    },
  };
}
