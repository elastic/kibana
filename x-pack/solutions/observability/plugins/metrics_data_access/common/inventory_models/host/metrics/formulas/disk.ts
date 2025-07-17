/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';
import {
  DISK_READ_IOPS_LABEL,
  DISK_READ_THROUGHPUT_LABEL,
  DISK_SPACE_AVAILABILITY_LABEL,
  DISK_SPACE_AVAILABLE_LABEL,
  DISK_USAGE_AVERAGE_LABEL,
  DISK_USAGE_LABEL,
  DISK_WRITE_IOPS_LABEL,
  DISK_WRITE_THROUGHPUT_LABEL,
} from '../../../shared/charts/constants';

export const diskIORead: LensBaseLayer = {
  label: DISK_READ_IOPS_LABEL,
  value: `defaults(
        counter_rate(max(system.diskio.read.count), kql='system.diskio.read.count: *'),
        counter_rate(max(system.disk.operations, kql='attributes.direction: read'))    
    )`,
  format: 'number',
  decimals: 0,
  normalizeByUnit: 's',
};

export const diskReadThroughput: LensBaseLayer = {
  label: DISK_READ_THROUGHPUT_LABEL,
  value: `defaults(
        counter_rate(max(system.diskio.read.bytes), kql='system.diskio.read.bytes: *'),
        counter_rate(max(system.disk.io, kql='attributes.direction: read'))    
    )`,
  format: 'bytes',
  decimals: 1,
  normalizeByUnit: 's',
};

export const diskSpaceAvailable: LensBaseLayer = {
  label: DISK_SPACE_AVAILABLE_LABEL,
  value: `defaults(average(system.filesystem.free), average(system.filesystem.usage, kql='state: free'))`,
  format: 'bytes',
  decimals: 0,
};

export const diskSpaceAvailability: LensBaseLayer = {
  label: DISK_SPACE_AVAILABILITY_LABEL,
  value: '1 - average(system.filesystem.used.pct)',
  format: 'percent',
  decimals: 0,
};

export const diskUsage: LensBaseLayer = {
  label: DISK_USAGE_LABEL,
  value: `defaults(
        max(system.filesystem.used.pct),
        1 - sum(metrics.system.filesystem.usage, kql='state: free')/sum(metrics.system.filesystem.usage)
    )`,
  format: 'percent',
  decimals: 0,
};

export const diskUsageAverage: LensBaseLayer = {
  label: DISK_USAGE_AVERAGE_LABEL,
  value: 'average(system.filesystem.used.pct)',
  format: 'percent',
  decimals: 0,
};

export const diskUsageAverageOTel: LensBaseLayer = {
    label: DISK_USAGE_AVERAGE_LABEL,
    value: `1 - sum(metrics.system.filesystem.usage, kql='state: free')/sum(metrics.system.filesystem.usage)`,
    format: 'percent',
    decimals: 0,
  };

export const diskIOWrite: LensBaseLayer = {
  label: DISK_WRITE_IOPS_LABEL,
  value: `defaults(
        counter_rate(max(system.diskio.write.count), kql='system.diskio.write.count: *'),
        counter_rate(max(system.disk.operations, kql='attributes.direction: write'))    
    )`,
  format: 'number',
  decimals: 0,
  normalizeByUnit: 's',
};

export const diskWriteThroughput: LensBaseLayer = {
  label: DISK_WRITE_THROUGHPUT_LABEL,
  value: `defaults(
        counter_rate(max(system.diskio.write.bytes), kql='system.diskio.write.bytes: *'),
        counter_rate(max(system.disk.io, kql='attributes.direction: write'))    
    )`,
  format: 'bytes',
  decimals: 1,
  normalizeByUnit: 's',
};
