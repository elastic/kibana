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
import type { RDSAggregations } from './snapshot';
import { MetricsCatalog } from '../../shared/metrics/metrics_catalog';
import type { InventoryMetricsConfig } from '../../shared/metrics/types';

export const metrics: InventoryMetricsConfig<RDSAggregations> = {
  tsvb: {
    awsRDSLatency,
    awsRDSConnections,
    awsRDSCpuTotal,
    awsRDSQueriesExecuted,
    awsRDSActiveTransactions,
  },
  requiredTsvb: [
    'awsRDSCpuTotal',
    'awsRDSConnections',
    'awsRDSQueriesExecuted',
    'awsRDSActiveTransactions',
    'awsRDSLatency',
  ],
  getAggregations: async (args) => {
    const { snapshot } = await import('./snapshot');
    const catalog = new MetricsCatalog(snapshot, args?.schema);
    return catalog;
  },
  getWaffleMapTooltipMetrics: () => [
    'cpu',
    'rdsLatency',
    'rdsConnections',
    'rdsQueriesExecuted',
    'rdsActiveTransactions',
  ],
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 14400, // 4 hours
};
