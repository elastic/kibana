/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpuV2 } from './cpu_v2';
import { diskSpaceUsage } from './disk_space_usage';
import { memory } from './memory';
import { memoryFree } from './memory_free';
import { rxV2 } from './rx_v2';
import { txV2 } from './tx_v2';

describe('host snapshot aggregations', () => {
  it('computes CPU from idle-only state for semconv', () => {
    const semconvCpu = cpuV2.semconv as Record<string, any>;
    expect(semconvCpu.cpu_idle.terms.include).toEqual(['idle']);
  });

  it('computes memory from used-only state for semconv', () => {
    const semconvMemory = memory.semconv as Record<string, any>;
    expect(semconvMemory.memory.bucket_script.buckets_path).toEqual({
      memoryUsedCount: 'memory_utilization_used_stats.count',
      memoryUsedTotal: 'memory_utilization_used_total',
    });
  });

  it('computes disk usage from semconv state usage values', () => {
    const semconvDisk = diskSpaceUsage.semconv as Record<string, any>;
    expect(semconvDisk.disk_usage_state_free.terms.include).toEqual(['free']);
    expect(semconvDisk.diskSpaceUsage.bucket_script.buckets_path).toEqual({
      freeTotal: 'disk_usage_state_free_total',
      usageTotal: 'disk_usage_state_all_total',
    });
  });

  describe('semconv usage metrics with no state bucket to read', () => {
    // `sum_bucket` cannot tell an absent `state` field apart from a state that
    // sums to zero: both come back as 0. Every usage metric below therefore has
    // to prove it saw a value before it reports one, otherwise a host that
    // stopped reporting per-state metrics reads as 100% CPU or 0% memory.
    it('returns null for CPU instead of coercing to 1 - 0 = 100%', () => {
      const { bucket_script: bucketScript } = (cpuV2.semconv as Record<string, any>).cpuV2;

      expect((cpuV2.semconv as Record<string, any>).cpu_idle_stats.stats_bucket.buckets_path).toBe(
        'cpu_idle.avg'
      );
      expect(bucketScript.buckets_path.cpuIdleCount).toBe('cpu_idle_stats.count');
      expect(bucketScript.script).toBe('params.cpuIdleCount > 0 ? 1 - params.cpuIdleTotal : null');
    });

    it('returns null for memory usage instead of 0%', () => {
      const semconvMemory = memory.semconv as Record<string, any>;

      expect(semconvMemory.memory_utilization_used_stats.stats_bucket.buckets_path).toBe(
        'memory_utilization_used.avg'
      );
      expect(semconvMemory.memory.bucket_script.script).toBe(
        'params.memoryUsedCount > 0 ? params.memoryUsedTotal : null'
      );
    });

    it('returns null for free memory instead of 0 bytes', () => {
      const semconvMemoryFree = memoryFree.semconv as Record<string, any>;

      expect(semconvMemoryFree.memory_usage_states.terms.include).toEqual([
        'cached',
        'free',
        'slab_unreclaimable',
        'slab_reclaimable',
      ]);
      expect(semconvMemoryFree.memory_usage_stats.stats_bucket.buckets_path).toBe(
        'memory_usage_states.avg'
      );
      expect(semconvMemoryFree.memoryFree.bucket_script.buckets_path.memoryUsageCount).toBe(
        'memory_usage_stats.count'
      );
      expect(semconvMemoryFree.memoryFree.bucket_script.script).toBe(
        'params.memoryUsageCount > 0 ? (params.memoryCachedTotal + params.memoryFreeTotal) - (params.memorySlabUnreclaimableTotal + params.memorySlabReclaimableTotal) : null'
      );
    });

    it('returns null for disk usage instead of 0%', () => {
      const semconvDisk = diskSpaceUsage.semconv as Record<string, any>;

      expect(semconvDisk.diskSpaceUsage.bucket_script.script).toBe(
        'params.usageTotal > 0 ? 1 - params.freeTotal / params.usageTotal : null'
      );
    });

    it('keeps sum_bucket in place so alerting still detects these aggregations', () => {
      // `isInterfaceRateAgg` in the inventory threshold rule pattern-matches on
      // a terms + sum_bucket pair, so the guards must be additive.
      for (const aggregations of [cpuV2.semconv, memory.semconv, memoryFree.semconv]) {
        const values = Object.values(aggregations as Record<string, any>);
        expect(values.some((agg) => agg.sum_bucket !== undefined)).toBe(true);
      }
    });
  });

  it('returns null for ECS network metrics when the host has no network documents', () => {
    const ecsRx = rxV2.ecs as Record<string, any>;
    const ecsTx = txV2.ecs as Record<string, any>;

    expect(ecsRx.rxV2.bucket_script.buckets_path).toEqual({
      value: 'rx_sum',
      count: 'rx_count',
      minTime: 'min_timestamp',
      maxTime: 'max_timestamp',
    });
    expect(ecsRx.rxV2.bucket_script.script.source).toBe(
      'params.count > 0 ? params.value / ((params.maxTime - params.minTime) / 1000) : null'
    );

    expect(ecsTx.txV2.bucket_script.buckets_path).toEqual({
      value: 'tx_sum',
      count: 'tx_count',
      minTime: 'min_timestamp',
      maxTime: 'max_timestamp',
    });
    expect(ecsTx.txV2.bucket_script.script.source).toBe(
      'params.count > 0 ? params.value / ((params.maxTime - params.minTime) / 1000) : null'
    );
  });
});
