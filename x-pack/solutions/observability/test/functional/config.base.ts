/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';
import { defineDockerServersConfig, fleetPackageRegistryDockerImage } from '@kbn/test';
import { join } from 'path';
import { pageObjects } from './page_objects';
import { services } from './services';

const packageRegistryConfig = join(__dirname, './package_registry_config.yml');
const dockerArgs: string[] = ['-v', `${packageRegistryConfig}:/package-registry/config.yml`];

/**
 * This is used by CI to set the docker registry port
 * you can also define this environment variable locally when running tests which
 * will spin up a local docker package registry locally for you
 * if this is defined it takes precedence over the `packageRegistryOverride` variable
 */
const dockerRegistryPort: string | undefined = process.env.FLEET_PACKAGE_REGISTRY_PORT;

export async function getFunctionalConfig({ readConfigFile }: FtrConfigProviderContext) {
  const xPackPlatformFunctionalTestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack-platform/functional/config.base')
  );

  return {
    ...xPackPlatformFunctionalTestsConfig.getAll(),
    services,
    pageObjects,
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    servers: xPackPlatformFunctionalTestsConfig.get('servers'),
    dockerServers: defineDockerServersConfig({
      registry: {
        enabled: !!dockerRegistryPort,
        image: fleetPackageRegistryDockerImage,
        portInContainer: 8080,
        port: dockerRegistryPort,
        args: dockerArgs,
        waitForLogLine: 'package manifests loaded',
        waitForLogLineTimeoutMs: 60 * 4 * 1000, // 4 minutes
      },
    }),
    security: xPackPlatformFunctionalTestsConfig.get('security'),
    junit: {
      reportName: 'X-Pack Observability Functional UI Tests',
    },
    kbnTestServer: {
      ...xPackPlatformFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [...xPackPlatformFunctionalTestsConfig.get('kbnTestServer.serverArgs')],
    },
    esTestCluster: {
      ...xPackPlatformFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [...xPackPlatformFunctionalTestsConfig.get('esTestCluster.serverArgs')],
    },
  };
}

export default getFunctionalConfig;
