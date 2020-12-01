/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { defineDockerServersConfig } from '@kbn/test';

// Docker image to use for Fleet API integration tests.
// This hash comes from the commit hash here: https://github.com/elastic/package-storage/commit
export const dockerImage =
  'docker.elastic.co/package-registry/distribution:fb58d670bafbac7e9e28baf6d6f99ba65cead548';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  const registryPort: string | undefined = process.env.FLEET_PACKAGE_REGISTRY_PORT;

  // mount the config file for the package registry as well as
  // the directory containing additional packages into the container
  const dockerArgs: string[] = [
    '-v',
    `${path.join(
      path.dirname(__filename),
      './apis/fixtures/package_registry_config.yml'
    )}:/package-registry/config.yml`,
    '-v',
    `${path.join(
      path.dirname(__filename),
      './apis/fixtures/test_packages'
    )}:/packages/test-packages`,
  ];

  return {
    testFiles: [require.resolve('./apis')],
    servers: xPackAPITestsConfig.get('servers'),
    dockerServers: defineDockerServersConfig({
      registry: {
        enabled: !!registryPort,
        image: dockerImage,
        portInContainer: 8080,
        port: registryPort,
        args: dockerArgs,
        waitForLogLine: 'package manifests loaded',
      },
    }),
    esArchiver: xPackAPITestsConfig.get('esArchiver'),
    services: {
      ...xPackAPITestsConfig.get('services'),
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
        ...(registryPort ? [`--xpack.fleet.registryUrl=http://localhost:${registryPort}`] : []),
      ],
    },
  };
}
