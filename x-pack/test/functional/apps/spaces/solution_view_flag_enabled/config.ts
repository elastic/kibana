/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

/**
 * NOTE: The solution view is currently only available in the cloud environment.
 * This test suite fakes a cloud environement by setting the cloud.id and cloud.base_url
 */

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../../config.base.js'));

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('.')],
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        // Note: the base64 string in the cloud.id config contains the ES endpoint required in the functional tests
        '--xpack.cloud.id=ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM=',
        '--xpack.cloud.base_url=https://cloud.elastic.co',
        '--xpack.cloud.deployment_url=/deployments/deploymentId',
      ],
    },
  };
}
