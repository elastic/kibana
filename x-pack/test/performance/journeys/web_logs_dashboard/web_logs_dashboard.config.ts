/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import * as saferLodashSet from '@elastic/safer-lodash-set';
import { serializeApmGlobalLabels } from '../../utils';

async function webLogsDashboard({ readConfigFile, log }: FtrConfigProviderContext) {
  const performanceConfig = await readConfigFile(require.resolve('../performance.config'));

  const testFiles = [require.resolve('./web_logs_dashboard')];

  const config = {
    testFiles,
    ...performanceConfig.getAll(),
  };

  const apmGlobalLabels = {
    ...performanceConfig.get('kbnTestServer').env,
    ftrConfig: `x-pack/test/performance/tests/journeys/web_logs_dashboard/web_logs_dashboard.config.ts`,
    performancePhase: process.env.TEST_PERFORMANCE_PHASE,
    journeyName: 'web_logs_dashboard',
  };

  saferLodashSet.set(
    config,
    'kbnTestServer.env.ELASTIC_APM_GLOBAL_LABELS',
    serializeApmGlobalLabels(apmGlobalLabels)
  );

  return config;
}

export default webLogsDashboard;
