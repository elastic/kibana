/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RiskEngineMetrics } from '@kbn/security-solution-plugin/server/usage/risk_engine/types';

/**
 * Given a body this will return the risk engine metrics from it.
 * @param body The Stats body
 * @returns Detection metrics
 */
export const getRiskEngineMetricsFromBody = (
  body: Array<{
    stats: {
      stack_stats: {
        kibana: { plugins: { security_solution: { riskEngineMetrics: {} } } };
      };
    };
  }>
): RiskEngineMetrics => {
  return body[0].stats.stack_stats.kibana.plugins.security_solution.riskEngineMetrics;
};
