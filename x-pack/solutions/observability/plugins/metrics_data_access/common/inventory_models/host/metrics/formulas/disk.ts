/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DISK_READ_IOPS_LABEL,
  DISK_READ_THROUGHPUT_LABEL,
  DISK_SPACE_AVAILABLE_LABEL,
  DISK_USAGE_AVERAGE_LABEL,
  DISK_USAGE_LABEL,
  DISK_WRITE_IOPS_LABEL,
  DISK_WRITE_THROUGHPUT_LABEL,
} from '../../../shared/charts/constants';
import type { SchemaBasedFormula } from '../../../shared/metrics/types';

export const diskIORead: SchemaBasedFormula = {
  label: DISK_READ_IOPS_LABEL,
  value: {
    ecs: "counter_rate(max(system.diskio.read.count), kql='system.diskio.read.count: *')",
    semconv: "counter_rate(max(system.disk.operations, kql='attributes.direction: read'))",
  },
  format: 'number',
  decimals: 0,
  normalizeByUnit: 's',
};

export const diskReadThroughput: SchemaBasedFormula = {
  label: DISK_READ_THROUGHPUT_LABEL,
  value: {
    ecs: "counter_rate(max(system.diskio.read.bytes), kql='system.diskio.read.bytes: *')",
    semconv: "counter_rate(max(system.disk.io, kql='attributes.direction: read'))",
  },
  format: 'bytes',
  decimals: 1,
  normalizeByUnit: 's',
};

export const diskSpaceAvailable: SchemaBasedFormula = {
  label: DISK_SPACE_AVAILABLE_LABEL,
  value: {
    ecs: 'average(system.filesystem.free)',
    semconv: "average(system.filesystem.usage, kql='state: free')",
  },
  format: 'bytes',
  decimals: 0,
};

export const diskUsage: SchemaBasedFormula = {
  label: DISK_USAGE_LABEL,
  value: {
    ecs: 'max(system.filesystem.used.pct)',
    semconv: 'max(metrics.system.filesystem.utilization)',
  },
  format: 'percent',
  decimals: 0,
};

export const diskUsageAverage: SchemaBasedFormula = {
  label: DISK_USAGE_AVERAGE_LABEL,
  value: {
    ecs: 'average(system.filesystem.used.pct)',
    semconv:
      "1 - sum(metrics.system.filesystem.usage, kql='state: free') / sum(metrics.system.filesystem.usage)",
  },
  format: 'percent',
  decimals: 0,
};

export const diskIOWrite: SchemaBasedFormula = {
  label: DISK_WRITE_IOPS_LABEL,
  value: {
    ecs: "counter_rate(max(system.diskio.write.count), kql='system.diskio.write.count: *')",
    semconv: "counter_rate(max(system.disk.operations, kql='attributes.direction: write'))",
  },
  format: 'number',
  decimals: 0,
  normalizeByUnit: 's',
};

export const diskWriteThroughput: SchemaBasedFormula = {
  label: DISK_WRITE_THROUGHPUT_LABEL,
  value: {
    ecs: "counter_rate(max(system.diskio.write.bytes), kql='system.diskio.write.bytes: *')",
    semconv: "counter_rate(max(system.disk.io, kql='attributes.direction: write'))",
  },
  format: 'bytes',
  decimals: 1,
  normalizeByUnit: 's',
};
