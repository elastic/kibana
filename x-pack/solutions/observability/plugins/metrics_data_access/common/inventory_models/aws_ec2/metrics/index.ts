/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { awsEC2CpuUtilization } from './tsvb/aws_ec2_cpu_utilization';
import { awsEC2NetworkTraffic } from './tsvb/aws_ec2_network_traffic';
import { awsEC2DiskIOBytes } from './tsvb/aws_ec2_diskio_bytes';
import { MetricsCatalog } from '../../shared/metrics/metrics_catalog';
import type { SQSAggregations } from './snapshot';
import type { InventoryMetricsConfig } from '../../shared/metrics/types';
export const metrics: InventoryMetricsConfig<SQSAggregations> = {
  tsvb: {
    awsEC2CpuUtilization,
    awsEC2NetworkTraffic,
    awsEC2DiskIOBytes,
  },
  requiredTsvb: ['awsEC2CpuUtilization', 'awsEC2NetworkTraffic', 'awsEC2DiskIOBytes'],
  getAggregations: async (args) => {
    const { snapshot } = await import('./snapshot');
    const catalog = new MetricsCatalog(snapshot, args?.schema);
    return catalog;
  },
  getWaffleMapTooltipMetrics: () => ['cpu', 'rx', 'tx'],
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 14400, // 4 hours
};
