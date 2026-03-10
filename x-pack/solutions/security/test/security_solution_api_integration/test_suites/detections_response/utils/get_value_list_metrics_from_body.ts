/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValueListMetricsSchema } from '@kbn/security-solution-plugin/server/usage/value_lists/types';

/**
 * Given a body this will return the value list metrics from it.
 * @param body The Stats body
 * @returns Value list metrics
 */
export const getValueListMetricsFromBody = (
  body: Array<{
    stats: {
      stack_stats: {
        kibana: { plugins: { security_solution: { valueListsMetrics: ValueListMetricsSchema } } };
      };
    };
  }>
): ValueListMetricsSchema => {
  return body[0].stats.stack_stats.kibana.plugins.security_solution.valueListsMetrics;
};
