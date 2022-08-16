/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import {
  FtrConfigProviderContext,
  defineDockerServersConfig,
  getKibanaCliLoggers,
} from '@kbn/test';

const getFullPath = (relativePath: string) => path.join(path.dirname(__filename), relativePath);
// Docker image to use for Fleet API integration tests.
// This hash comes from the latest successful build of the Snapshot Distribution of the Package Registry, for
// example: https://beats-ci.elastic.co/blue/organizations/jenkins/Ingest-manager%2Fpackage-storage/detail/snapshot/74/pipeline/257#step-302-log-1.
// It should be updated any time there is a new Docker image published for the Snapshot Distribution of the Package Registry.
export const dockerImage =
  'docker.elastic.co/package-registry/distribution:production-v2-experimental';

export const BUNDLED_PACKAGE_DIR = '/tmp/fleet_bundled_packages';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  const registryPort: string | undefined = process.env.FLEET_PACKAGE_REGISTRY_PORT;

  // mount the config file for the package registry as well as
  // the directories containing additional packages into the container
  const volumes = {
    // src : dest
    './apis/fixtures/package_registry_config.yml': '/package-registry/config.yml',
    './apis/fixtures/test_packages': '/packages/test-packages',
    './apis/fixtures/package_verification/packages/zips': '/packages/signed-test-packages',
  };
  const dockerArgs: string[] = Object.entries(volumes).flatMap(([src, dest]) => [
    '-v',
    `${getFullPath(src)}:${dest}`,
  ]);

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
    services: xPackAPITestsConfig.get('services'),
    junit: {
      reportName: 'X-Pack EPM API Integration Tests',
    },
    esTestCluster: xPackAPITestsConfig.get('esTestCluster'),
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        // always install Endpoint package by default when Fleet sets up
        `--xpack.fleet.packages.0.name=endpoint`,
        `--xpack.fleet.packages.0.version=latest`,
        ...(registryPort ? [`--xpack.fleet.registryUrl=http://localhost:${registryPort}`] : []),
        `--xpack.fleet.developer.bundledPackageLocation=${BUNDLED_PACKAGE_DIR}`,
        '--xpack.cloudSecurityPosture.enabled=true',
        `--xpack.fleet.packageVerification.gpgKeyPath=${getFullPath(
          './apis/fixtures/package_verification/signatures/fleet_test_key_public.asc'
        )}`,
        `--logging.loggers=${JSON.stringify([
          ...getKibanaCliLoggers(xPackAPITestsConfig.get('kbnTestServer.serverArgs')),

          // Enable debug fleet logs by default
          {
            name: 'plugins.fleet',
            level: 'debug',
            appenders: ['default'],
          },
        ])}`,
      ],
    },
  };
}
