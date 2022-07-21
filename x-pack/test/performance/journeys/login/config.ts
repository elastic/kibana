/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import { serializeApmGlobalLabels } from '../../utils';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const performanceConfig = await readConfigFile(require.resolve('../base.config'));

  const testFiles = [require.resolve('./login')];

  const config = {
    testFiles,
    scalabilitySetup: {
      warmup: [
        {
          action: 'constantConcurrentUsers',
          maxUsersCount: 10,
          duration: '30s',
        },
        {
          action: 'rampConcurrentUsers',
          minUsersCount: 10,
          maxUsersCount: 50,
          duration: '2m',
        },
      ],
      test: [
        {
          action: 'constantConcurrentUsers',
          maxUsersCount: 50,
          duration: '5m',
        },
      ],
      maxDuration: '10m',
    },
    ...performanceConfig.getAll(),
  };

  const apmGlobalLabels = {
    ...performanceConfig.get('kbnTestServer').env.ELASTIC_APM_GLOBAL_LABELS,
    ftrConfig: `x-pack/test/performance/tests/journeys/login/config.ts`,
    performancePhase: process.env.TEST_PERFORMANCE_PHASE,
    journeyName: 'login',
  };

  return {
    ...config,
    kbnTestServer: {
      ...config.kbnTestServer,
      env: {
        ...config.kbnTestServer.env,
        ELASTIC_APM_GLOBAL_LABELS: serializeApmGlobalLabels(apmGlobalLabels),
      },
    },
  };
}
