/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { awsRDSLatency } from './tsvb/aws_rds_latency';
import { awsRDSConnections } from './tsvb/aws_rds_connections';
import { awsRDSCpuTotal } from './tsvb/aws_rds_cpu_total';
import { awsRDSQueriesExecuted } from './tsvb/aws_rds_queries_executed';
import { awsRDSActiveTransactions } from './tsvb/aws_rds_active_transactions';
import { createInventoryModelMetrics } from '../../shared/create_inventory_model';

export const metrics = createInventoryModelMetrics({
  tsvb: {
    awsRDSLatency,
    awsRDSConnections,
    awsRDSCpuTotal,
    awsRDSQueriesExecuted,
    awsRDSActiveTransactions,
  },
  getAggregation: async (aggregation) =>
    await import('./snapshot').then(({ snapshot }) => snapshot[aggregation]),
  getAggregations: async () => await import('./snapshot').then(({ snapshot }) => snapshot),
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 14400, // 4 hours
});
