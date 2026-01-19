/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpu } from './cpu';
import { rdsLatency } from './rds_latency';
import { rdsConnections } from './rds_connections';
import { rdsQueriesExecuted } from './rds_queries_executed';
import { rdsActiveTransactions } from './rds_active_transactions';
import type { MetricConfigMap } from '../../../shared/metrics/types';

export const snapshot = {
  cpu,
  rdsLatency,
  rdsConnections,
  rdsQueriesExecuted,
  rdsActiveTransactions,
} satisfies MetricConfigMap;

export type RDSAggregations = typeof snapshot;
