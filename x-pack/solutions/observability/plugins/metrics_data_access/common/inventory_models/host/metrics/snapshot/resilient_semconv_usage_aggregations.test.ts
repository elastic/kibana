/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpuV2 } from './cpu_v2';
import { diskSpaceUsage } from './disk_space_usage';
import { memory } from './memory';

describe('host semconv usage aggregations', () => {
  it('computes CPU from idle-only state for semconv', () => {
    const semconvCpu = cpuV2.semconv as Record<string, any>;
    expect(semconvCpu.cpu_idle.terms.include).toEqual(['idle']);
  });

  it('computes memory from used-only state for semconv', () => {
    const semconvMemory = memory.semconv as Record<string, any>;
    expect(semconvMemory.memory.bucket_script.buckets_path).toEqual({
      memoryUsedTotal: 'memory_utilization_used_total',
    });
    expect(semconvMemory.memory.bucket_script.script).toBe('params.memoryUsedTotal');
  });

  it('computes disk usage from semconv state usage values', () => {
    const semconvDisk = diskSpaceUsage.semconv as Record<string, any>;
    expect(semconvDisk.disk_usage_state_free.terms.include).toEqual(['free']);
    expect(semconvDisk.diskSpaceUsage.bucket_script.buckets_path).toEqual({
      freeTotal: 'disk_usage_state_free_total',
      usageTotal: 'disk_usage_state_all_total',
    });
    expect(semconvDisk.diskSpaceUsage.bucket_script.script).toBe(
      'params.usageTotal > 0 ? 1 - params.freeTotal / params.usageTotal : 0'
    );
  });
});
