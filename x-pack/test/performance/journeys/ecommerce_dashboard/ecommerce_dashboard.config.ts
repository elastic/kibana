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

  const testFiles = [require.resolve('./ecommerce_dashboard')];

  const config = {
    testFiles,
    ...performanceConfig.getAll(),
  };

  const apmGlobalLabels = {
    ...performanceConfig.get('kbnTestServer').env,
    ftrConfig: `x-pack/test/performance/tests/journeys/ecommerce_dashboard/ecommerce_dashboard.config.ts`,
    performancePhase: process.env.TEST_PERFORMANCE_PHASE,
    journeyName: 'ecommerce_dashboard',
  };

  saferLodashSet.set(
    config,
    'kbnTestServer.env.ELASTIC_APM_GLOBAL_LABELS',
    serializeApmGlobalLabels(apmGlobalLabels)
  );

  return config;
}
