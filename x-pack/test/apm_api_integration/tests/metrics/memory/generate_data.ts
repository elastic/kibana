/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export const config = {
  memoryTotal: 536870912, // 0.5gb
  memoryFree: 94371840, // ~0.08 gb
  cGroupMemoryLimit: 104857000, // ~0.10gb
  cGroupMemoryUsage: 38547456, // 0,03gb
};

export const expectedValues = {
  expectedMemoryUsedRate: (config.memoryTotal - config.memoryFree) / config.memoryTotal,
  expectedMemoryUsed: config.memoryTotal - config.memoryFree,
};

export async function generateData({
  synthtraceEsClient,
  start,
  end,
}: {
  synthtraceEsClient: ApmSynthtraceEsClient;
  start: number;
  end: number;
}) {
  const { memoryTotal, memoryFree, cGroupMemoryLimit, cGroupMemoryUsage } = config;

  const systemMetricOnlyInstance = apm
    .service({ name: 'system-metric-only-service', environment: 'production', agentName: 'go' })
    .instance('system-metric-only-production');

  const cGroupMemoryOnlyInstance = apm
    .service({ name: 'cgroup-memory-only-service', environment: 'production', agentName: 'go' })
    .instance('cgroup-memory-only-production');

  const cGroupMemoryWithLimitInstance = apm
    .service({
      name: 'cgroup-memory-with-limit-production',
      environment: 'production',
      agentName: 'go',
    })
    .instance('cgroup-memory-with-limit-production');

  const transactionsEvents = timerange(start, end)
    .ratePerMinute(1)
    .generator((timestamp) => [
      systemMetricOnlyInstance
        .appMetrics({
          'system.memory.actual.free': memoryFree,
          'system.memory.total': memoryTotal,
        })
        .timestamp(timestamp),
      cGroupMemoryOnlyInstance
        .appMetrics({
          'system.process.cgroup.memory.mem.usage.bytes': cGroupMemoryUsage,
        })
        .timestamp(timestamp),

      cGroupMemoryWithLimitInstance
        .appMetrics({
          'system.process.cgroup.memory.mem.usage.bytes': cGroupMemoryUsage,
          'system.process.cgroup.memory.mem.limit.bytes': cGroupMemoryLimit,
          'system.memory.total': memoryTotal,
          'system.memory.actual.free': memoryFree,
        })
        .timestamp(timestamp),
    ]);

  await synthtraceEsClient.index(transactionsEvents);
}
