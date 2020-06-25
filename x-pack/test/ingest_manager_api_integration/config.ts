/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { defineDockerServersConfig } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  const registryPort: string | undefined = process.env.INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT;

  return {
    testFiles: [require.resolve('./apis')],
    servers: xPackAPITestsConfig.get('servers'),
    dockerServers: defineDockerServersConfig({
      registry: {
        enabled: !!registryPort,
        image: 'docker.elastic.co/package-registry/package-registry:PR-539',
        portInContainer: 8080,
        port: registryPort,
        waitForLogLine: 'package manifests loaded into memory',
      },
    }),
    services: {
      supertest: xPackAPITestsConfig.get('services.supertest'),
      es: xPackAPITestsConfig.get('services.es'),
    },
    junit: {
      reportName: 'X-Pack EPM API Integration Tests',
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        ...(registryPort
          ? [`--xpack.ingestManager.epm.registryUrl=http://localhost:${registryPort}`]
          : []),
      ],
    },
  };
}
