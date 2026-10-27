/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventLoopUtilization } from 'perf_hooks';

/** Process-wide health during a calculation, with background activity measured between runs. */
export interface RunHealthSummary {
  durationMs: number;
  cpu: { userMs: number; systemMs: number; cores: number };
  eventLoop: { utilization: number; delayMs: { p50: number; p99: number; max: number } };
  gc: {
    count: number;
    pauseMs: number;
    byKind: Record<string, { count: number; pauseMs: number }>;
  };
  heapMb: { start: number; end: number; peak: number; limit: number };
  rssMb: { start: number; peak: number };
  externalMb: { start: number; end: number; peak: number };
  arrayBuffersMb: { start: number; end: number; peak: number };
  concurrentRunsAtStart: number;
  /** Heap used when each named point of the run was reached, in run order. */
  marks: Array<{ name: string; atMs: number; heapUsedMb: number }>;
  background?: { windowMs: number; cores: number; eventLoopUtilization: number };
}

export interface RunHealthMonitor {
  mark: (name: string) => void;
  stop: () => RunHealthSummary;
}

export interface ProcessSnapshot {
  atMs: number;
  cpu: NodeJS.CpuUsage;
  elu: EventLoopUtilization;
}

export interface RunHealthTracker {
  start: () => RunHealthMonitor;
}

export type MemorySample = Pick<
  NodeJS.MemoryUsage,
  'heapUsed' | 'rss' | 'external' | 'arrayBuffers'
>;

export interface MemoryObservations {
  start: MemorySample;
  end: MemorySample;
  peak: MemorySample;
  heapLimit: number;
}

export interface ProcessHealthObservations {
  memory: MemoryObservations;
  gc: RunHealthSummary['gc'];
  eventLoopDelayNs: { p50: number; p99: number; max: number };
}

export interface ProcessHealthCollector {
  sampleMemory: () => MemorySample;
  stop: () => ProcessHealthObservations;
}
