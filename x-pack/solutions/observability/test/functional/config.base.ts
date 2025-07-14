/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';
import { pageObjects } from './page_objects';

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
