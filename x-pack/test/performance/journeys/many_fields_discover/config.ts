/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import { serializeApmGlobalLabels } from '../../utils';

const JOURNEY_MANY_FIELDS_DISCOVER = 'many_fields_discover';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const performanceConfig = await readConfigFile(require.resolve('../base.config'));

  const testFiles = [require.resolve(`./${JOURNEY_MANY_FIELDS_DISCOVER}`)];

  const config = {
    ...performanceConfig.getAll(),
    testFiles,
    testData: {
      kbnArchives: ['test/functional/fixtures/kbn_archiver/many_fields_data_view'],
      esArchives: ['test/functional/fixtures/es_archiver/many_fields'],
    },
  };

  const apmGlobalLabels = {
    ...performanceConfig.get('kbnTestServer').env.ELASTIC_APM_GLOBAL_LABELS,
    ftrConfig: `x-pack/test/performance/tests/journeys/${JOURNEY_MANY_FIELDS_DISCOVER}/config.ts`,
    performancePhase: process.env.TEST_PERFORMANCE_PHASE,
    journeyName: JOURNEY_MANY_FIELDS_DISCOVER,
  };

  return {
    ...config,
    kbnTestServer: {
      ...config.kbnTestServer,
      serverArgs: [
        ...performanceConfig.get('kbnTestServer.serverArgs'),
        `--telemetry.labels.journeyName=${JOURNEY_MANY_FIELDS_DISCOVER}`,
      ],
      env: {
        ...config.kbnTestServer.env,
        ELASTIC_APM_GLOBAL_LABELS: serializeApmGlobalLabels(apmGlobalLabels),
      },
    },
  };
}
