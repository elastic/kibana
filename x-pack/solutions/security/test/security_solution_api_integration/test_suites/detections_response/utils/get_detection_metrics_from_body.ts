/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionMetrics } from '@kbn/security-solution-plugin/server/usage/detections/types';

/**
 * Given a body this will return the detection metrics from it.
 * @param body The Stats body
 * @returns Detection metrics
 */
export const getDetectionMetricsFromBody = (
  body: Array<{
    stats: {
      stack_stats: {
        kibana: { plugins: { security_solution: { detectionMetrics: DetectionMetrics } } };
      };
    };
  }>
): DetectionMetrics => {
  return body[0].stats.stack_stats.kibana.plugins.security_solution.detectionMetrics;
};
