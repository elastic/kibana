/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type {
  MemoryObservations,
  MemorySample,
  ProcessHealthObservations,
  ProcessSnapshot,
  RunHealthSummary,
} from './run_health_types';

/** Builds a run-health report from completed observations and process snapshots. */
export const buildRunHealthSummary = ({
  startedAt,
  endedAt,
  observations,
  concurrentRunsAtStart,
  marks,
  background,
}: {
  startedAt: ProcessSnapshot;
  endedAt: ProcessSnapshot;
  observations: ProcessHealthObservations;
  concurrentRunsAtStart: number;
  marks: RunHealthSummary['marks'];
  background?: RunHealthSummary['background'];
}): RunHealthSummary => ({
  durationMs: Math.round(endedAt.atMs - startedAt.atMs),
  concurrentRunsAtStart,
  cpu: summarizeCpuUsage(startedAt, endedAt),
  eventLoop: {
    utilization: summarizeEventLoopUtilization(startedAt, endedAt),
    delayMs: summarizeEventLoopDelay(observations.eventLoopDelayNs),
  },
  gc: observations.gc,
  ...summarizeMemory(observations.memory),
  marks,
  background,
});

export const summarizeBackgroundActivity = (
  startedAt: ProcessSnapshot,
  endedAt: ProcessSnapshot
): RunHealthSummary['background'] => ({
  windowMs: endedAt.atMs - startedAt.atMs,
  cores: summarizeCpuUsage(startedAt, endedAt).cores,
  eventLoopUtilization: summarizeEventLoopUtilization(startedAt, endedAt),
});

const summarizeCpuUsage = (
  startedAt: ProcessSnapshot,
  endedAt: ProcessSnapshot
): RunHealthSummary['cpu'] => {
  const userMs = (endedAt.cpu.user - startedAt.cpu.user) / 1000;
  const systemMs = (endedAt.cpu.system - startedAt.cpu.system) / 1000;
  const durationMs = endedAt.atMs - startedAt.atMs;
  return {
    userMs: Math.round(userMs),
    systemMs: Math.round(systemMs),
    cores: durationMs > 0 ? round((userMs + systemMs) / durationMs) : 0,
  };
};

const summarizeEventLoopUtilization = (
  startedAt: ProcessSnapshot,
  endedAt: ProcessSnapshot
): number => round(performance.eventLoopUtilization(endedAt.elu, startedAt.elu).utilization);

const summarizeEventLoopDelay = (
  delayNs: ProcessHealthObservations['eventLoopDelayNs']
): RunHealthSummary['eventLoop']['delayMs'] => ({
  p50: round(delayNs.p50 / 1e6, 1),
  p99: round(delayNs.p99 / 1e6, 1),
  max: round(delayNs.max / 1e6, 1),
});

const summarizeMemory = (
  memory: MemoryObservations
): Pick<RunHealthSummary, 'heapMb' | 'rssMb' | 'externalMb' | 'arrayBuffersMb'> => ({
  heapMb: { ...summarizeMemoryRange(memory, 'heapUsed'), limit: bytesToMiB(memory.heapLimit) },
  rssMb: { start: bytesToMiB(memory.start.rss), peak: bytesToMiB(memory.peak.rss) },
  externalMb: summarizeMemoryRange(memory, 'external'),
  arrayBuffersMb: summarizeMemoryRange(memory, 'arrayBuffers'),
});

const summarizeMemoryRange = (
  { start, end, peak }: MemoryObservations,
  field: keyof MemorySample
) => ({
  start: bytesToMiB(start[field]),
  end: bytesToMiB(end[field]),
  peak: bytesToMiB(peak[field]),
});

const bytesToMiB = (bytes: number): number => Math.round(bytes / 1024 / 1024);
const round = (value: number, digits = 2): number => Number(value.toFixed(digits));
