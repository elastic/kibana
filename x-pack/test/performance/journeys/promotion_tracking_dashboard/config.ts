/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import { serializeApmGlobalLabels } from '../../utils';

const JOURNEY_PROMOTION_TRACKING_DASHBOARD = 'promotion_tracking_dashboard';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const performanceConfig = await readConfigFile(require.resolve('../base.config'));

  const testFiles = [require.resolve(`./${JOURNEY_PROMOTION_TRACKING_DASHBOARD}`)];

  const config = {
    ...performanceConfig.getAll(),
    testFiles,
    testData: {
      kbnArchives: ['x-pack/test/performance/kbn_archives/promotion_tracking_dashboard'],
      esArchives: ['x-pack/test/performance/es_archives/ecommerce_sample_data'],
    },
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
  };

  const apmGlobalLabels = {
    ...performanceConfig.get('kbnTestServer').env.ELASTIC_APM_GLOBAL_LABELS,
    ftrConfig: `x-pack/test/performance/tests/journeys/${JOURNEY_PROMOTION_TRACKING_DASHBOARD}/config.ts`,
    performancePhase: process.env.TEST_PERFORMANCE_PHASE,
    journeyName: JOURNEY_PROMOTION_TRACKING_DASHBOARD,
  };

  return {
    ...config,
    kbnTestServer: {
      ...config.kbnTestServer,
      serverArgs: [
        ...performanceConfig.get('kbnTestServer.serverArgs'),
        `--telemetry.labels.journeyName=${JOURNEY_PROMOTION_TRACKING_DASHBOARD}`,
      ],
      env: {
        ...config.kbnTestServer.env,
        ELASTIC_APM_GLOBAL_LABELS: serializeApmGlobalLabels(apmGlobalLabels),
      },
    },
  };
}
