/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import { serializeApmGlobalLabels } from '../../utils';

export const JOURNEY_DATA_STRESS_TEST_LENS = 'data_stress_test_lens';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const performanceConfig = await readConfigFile(require.resolve('../base.config'));

  const testFiles = [require.resolve(`./${JOURNEY_DATA_STRESS_TEST_LENS}`)];

  const config = {
    ...performanceConfig.getAll(),
    testFiles,
    testData: {
      kbnArchives: ['test/functional/fixtures/kbn_archiver/stress_test'],
      esArchives: ['test/functional/fixtures/es_archiver/stress_test'],
    },
  };

  const apmGlobalLabels = {
    ...performanceConfig.get('kbnTestServer').env.ELASTIC_APM_GLOBAL_LABELS,
    ftrConfig: `x-pack/test/performance/tests/journeys/${JOURNEY_DATA_STRESS_TEST_LENS}/config.ts`,
    performancePhase: process.env.TEST_PERFORMANCE_PHASE,
    journeyName: JOURNEY_DATA_STRESS_TEST_LENS,
  };

  return {
    ...config,
    kbnTestServer: {
      ...config.kbnTestServer,
      serverArgs: [
        ...performanceConfig.get('kbnTestServer.serverArgs'),
        `--telemetry.labels.journeyName=${JOURNEY_DATA_STRESS_TEST_LENS}`,
      ],
      env: {
        ...config.kbnTestServer.env,
        ELASTIC_APM_GLOBAL_LABELS: serializeApmGlobalLabels(apmGlobalLabels),
      },
    },
  };
}
