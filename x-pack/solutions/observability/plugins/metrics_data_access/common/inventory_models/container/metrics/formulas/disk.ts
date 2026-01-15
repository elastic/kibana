/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISK_READ_IOPS_LABEL, DISK_WRITE_IOPS_LABEL } from '../../../shared/charts/constants';
import type { SchemaBasedFormula } from '../../../shared/metrics/types';

export const dockerContainerDiskIORead: SchemaBasedFormula = {
  label: DISK_READ_IOPS_LABEL,
  value: {
    ecs: "counter_rate(max(docker.diskio.read.ops), kql='docker.diskio.read.ops: *')",
    semconv: "counter_rate(max(metrics.container.disk.io, kql='disk.io.direction: read'))",
  },
  format: 'number',
  decimals: 0,
  normalizeByUnit: 's',
};

export const dockerContainerDiskIOWrite: SchemaBasedFormula = {
  label: DISK_WRITE_IOPS_LABEL,
  value: {
    ecs: "counter_rate(max(docker.diskio.write.ops), kql='docker.diskio.write.ops: *')",
    semconv: "counter_rate(max(metrics.container.disk.io, kql='disk.io.direction: write'))",
  },
  format: 'number',
  decimals: 0,
  normalizeByUnit: 's',
};
