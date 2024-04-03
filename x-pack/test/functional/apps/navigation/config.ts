/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { services, pageObjects } from './ftr_provider_context';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaFunctionalConfig = await readConfigFile(require.resolve('../../config.base.js'));

  return {
    testFiles: [require.resolve('./tests')],
    servers: {
      ...kibanaFunctionalConfig.get('servers'),
    },
    services,
    pageObjects,

    junit: {
      reportName: 'X-Pack Navigation Functional Tests',
    },

    esTestCluster: {
      ...kibanaFunctionalConfig.get('esTestCluster'),
      license: 'trial',
      serverArgs: [`xpack.license.self_generated.type='trial'`],
    },
    apps: {
      ...kibanaFunctionalConfig.get('apps'),
    },

    kbnTestServer: {
      ...kibanaFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaFunctionalConfig.get('kbnTestServer.serverArgs'),
        '--xpack.cloud_integrations.experiments.enabled=true',
        '--xpack.cloud_integrations.experiments.flag_overrides.navigation.solutionNavEnabled=true',
        '--navigation.solutionNavigation.enabled=true',
        '--navigation.solutionNavigation.defaultSolution=es',
        // Note: the base64 string in the cloud.id config contains the ES endpoint required in the functional tests
        '--xpack.cloud.id=ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM=',
        '--xpack.cloud.base_url=https://cloud.elastic.co',
        '--xpack.cloud.deployment_url=/deployments/deploymentId',
        '--xpack.cloud.organization_url=/organization/organizationId',
        '--xpack.cloud.billing_url=/billing',
        '--xpack.cloud.profile_url=/user/userId',
      ],
    },
  };
}
