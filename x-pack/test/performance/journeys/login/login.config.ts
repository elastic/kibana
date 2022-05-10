/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import * as saferLodashSet from '@elastic/safer-lodash-set';
import { serializeApmGlobalLabels } from '../../utils';

export default async function ({ readConfigFile, log }: FtrConfigProviderContext) {
  const performanceConfig = await readConfigFile(require.resolve('../performance.config'));

  const testFiles = [require.resolve('./login')];

  const config = {
    testFiles,
    ...performanceConfig.getAll(),
  };

  const apmGlobalLabels = {
    ...performanceConfig.get('kbnTestServer').env,
    ftrConfig: `x-pack/test/performance/tests/journeys/login/login.config.ts`,
    performancePhase: process.env.TEST_PERFORMANCE_PHASE,
    journeyName: 'login',
  };

  saferLodashSet.set(
    config,
    'kbnTestServer.env.ELASTIC_APM_GLOBAL_LABELS',
    serializeApmGlobalLabels(apmGlobalLabels)
  );

  return config;
}
