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
// This hash comes from the latest successful build of the Production Distribution of the Package Registry, for
// example: https://internal-ci.elastic.co/blue/organizations/jenkins/package_storage%2Findexing-job/detail/main/1884/pipeline/147.
// It should be updated any time there is a new package published.
export const dockerImage = 'docker.elastic.co/package-registry/distribution:lite';

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
    servers: xPackAPITestsConfig.get('servers'),
    dockerServers: defineDockerServersConfig({
      registry: {
        enabled: !!registryPort,
        image: dockerImage,
        portInContainer: 8080,
        port: registryPort,
        args: dockerArgs,
        waitForLogLine: 'package manifests loaded',
        waitForLogLineTimeoutMs: 60 * 2 * 10000, // 2 minutes
      },
    }),
    services: xPackAPITestsConfig.get('services'),
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
        `--xpack.fleet.developer.disableBundledPackagesCache=true`,
        '--xpack.cloudSecurityPosture.enabled=true',
        `--xpack.fleet.developer.maxAgentPoliciesWithInactivityTimeout=10`,
        `--xpack.fleet.packageVerification.gpgKeyPath=${getFullPath(
          './apis/fixtures/package_verification/signatures/fleet_test_key_public.asc'
        )}`,
        `--xpack.securitySolution.enableExperimental=${JSON.stringify(['endpointRbacEnabled'])}`,
        `--xpack.fleet.enableExperimental=${JSON.stringify([
          'outputSecretsStorage',
          'agentTamperProtectionEnabled',
          'enableStrictKQLValidation',
          'subfeaturePrivileges',
        ])}`,
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
