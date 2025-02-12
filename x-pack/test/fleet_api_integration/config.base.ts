/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import {
  fleetPackageRegistryDockerImage,
  FtrConfigProviderContext,
  defineDockerServersConfig,
  getKibanaCliLoggers,
} from '@kbn/test';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';

const getFullPath = (relativePath: string) => path.join(path.dirname(__filename), relativePath);

export const BUNDLED_PACKAGE_DIR = '/tmp/fleet_bundled_packages';

export default async function ({ readConfigFile, log }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  const registryPort: string | undefined = process.env.FLEET_PACKAGE_REGISTRY_PORT;
  const skipRunningDockerRegistry =
    process.env.FLEET_SKIP_RUNNING_PACKAGE_REGISTRY === 'true' ? true : false;

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

  const dockerServers = !skipRunningDockerRegistry
    ? defineDockerServersConfig({
        registry: {
          enabled: !!registryPort,
          image: fleetPackageRegistryDockerImage,
          portInContainer: 8080,
          port: registryPort,
          args: dockerArgs,
          waitForLogLine: 'package manifests loaded',
          waitForLogLineTimeoutMs: 60 * 2 * 10000, // 2 minutes
        },
      })
    : undefined;

  if (skipRunningDockerRegistry) {
    const cmd = `docker run ${dockerArgs.join(
      ' '
    )} -p ${registryPort}:8080 ${fleetPackageRegistryDockerImage}`;
    log.warning(`Not running docker registry, you can run it with the following command: ${cmd}`);
  }

  return {
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    servers: xPackAPITestsConfig.get('servers'),
    dockerServers,
    services: xPackAPITestsConfig.get('services'),
    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [...xPackAPITestsConfig.get('esTestCluster.serverArgs'), 'http.host=0.0.0.0'],
    },
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
        `--xpack.fleet.enableExperimental=${JSON.stringify(['enableAutomaticAgentUpgrades'])}`,
        `--xpack.cloud.id='123456789'`,
        `--xpack.fleet.agentless.enabled=true`,
        `--xpack.fleet.agentless.api.url=https://api.agentless.url/api/v1/ess`,
        `--xpack.fleet.agentless.api.tls.certificate=./config/node.crt`,
        `--xpack.fleet.agentless.api.tls.key=./config/node.key`,
        `--xpack.fleet.agentless.api.tls.ca=./config/ca.crt`,
        `--xpack.fleet.internal.registry.kibanaVersionCheckEnabled=false`,
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
