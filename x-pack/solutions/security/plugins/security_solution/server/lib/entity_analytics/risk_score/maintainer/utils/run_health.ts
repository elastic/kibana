/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventLoopUtilization } from 'perf_hooks';
import { constants, monitorEventLoopDelay, performance, PerformanceObserver } from 'perf_hooks';
import { getHeapStatistics } from 'v8';

/**
 * Kibana process health over one maintainer run. Every value is process-wide: other plugins and
 * tasks share the process, and entity types score concurrently, so the numbers describe the run's
 * window rather than the risk score code alone. The background figures cover the gap since the
 * previous run ended, as a reference for the process's idle load.
 */
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
  /** Heap used when each named point of the run was reached, in run order. */
  marks: Array<{ name: string; atMs: number; heapUsedMb: number }>;
  background?: { windowMs: number; cores: number; eventLoopUtilization: number };
}

export interface RunHealthMonitor {
  mark: (name: string) => void;
  stop: () => RunHealthSummary;
}

interface ProcessSnapshot {
  atMs: number;
  cpu: NodeJS.CpuUsage;
  elu: EventLoopUtilization;
}

const HEAP_SAMPLE_INTERVAL_MS = 1000;

const GC_KIND_NAMES: Record<number, string> = {
  [constants.NODE_PERFORMANCE_GC_MAJOR]: 'major',
  [constants.NODE_PERFORMANCE_GC_MINOR]: 'minor',
  [constants.NODE_PERFORMANCE_GC_INCREMENTAL]: 'incremental',
  [constants.NODE_PERFORMANCE_GC_WEAKCB]: 'weakcb',
};

const toMb = (bytes: number): number => Math.round(bytes / 1024 / 1024);
const round = (value: number, digits = 2): number => Number(value.toFixed(digits));
const nanosToMs = (nanos: number): number => round(nanos / 1e6, 1);

const gcKindName = (detail: unknown): string => {
  if (typeof detail === 'object' && detail !== null && 'kind' in detail) {
    const { kind } = detail;
    return typeof kind === 'number' ? GC_KIND_NAMES[kind] ?? `kind_${kind}` : 'unknown';
  }
  return 'unknown';
};

const takeSnapshot = (): ProcessSnapshot => ({
  atMs: Date.now(),
  cpu: process.cpuUsage(),
  elu: performance.eventLoopUtilization(),
});

/**
 * Creates a tracker that hands out one monitor per run. It remembers when the previous run ended,
 * so each run can report the process's background load since then without waiting before it starts.
 */
export const createRunHealthTracker = () => {
  let previousRunEnd: ProcessSnapshot | undefined;

  const start = (): RunHealthMonitor => {
    const startedAt = takeSnapshot();
    const background = previousRunEnd
      ? (() => {
          const windowMs = startedAt.atMs - previousRunEnd.atMs;
          const cpu = process.cpuUsage(previousRunEnd.cpu);
          return {
            windowMs,
            cores: windowMs > 0 ? round((cpu.user + cpu.system) / 1000 / windowMs) : 0,
            eventLoopUtilization: round(
              performance.eventLoopUtilization(startedAt.elu, previousRunEnd.elu).utilization
            ),
          };
        })()
      : undefined;

    const memoryAtStart = process.memoryUsage();
    let heapPeak = memoryAtStart.heapUsed;
    let rssPeak = memoryAtStart.rss;
    const sampleMemory = () => {
      const { heapUsed, rss } = process.memoryUsage();
      heapPeak = Math.max(heapPeak, heapUsed);
      rssPeak = Math.max(rssPeak, rss);
    };
    const sampler = setInterval(sampleMemory, HEAP_SAMPLE_INTERVAL_MS);
    sampler.unref();

    const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
    eventLoopDelay.enable();

    const gcByKind: Record<string, { count: number; pauseMs: number }> = {};
    const gcObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // `detail` is declared on marks and measures only, though gc entries carry it too.
        const kind = gcKindName('detail' in entry ? entry.detail : undefined);
        const current = gcByKind[kind] ?? { count: 0, pauseMs: 0 };
        gcByKind[kind] = { count: current.count + 1, pauseMs: current.pauseMs + entry.duration };
      }
    });
    gcObserver.observe({ entryTypes: ['gc'] });

    const marks: RunHealthSummary['marks'] = [];

    return {
      mark: (name) => {
        const { heapUsed } = process.memoryUsage();
        heapPeak = Math.max(heapPeak, heapUsed);
        marks.push({ name, atMs: Date.now() - startedAt.atMs, heapUsedMb: toMb(heapUsed) });
      },
      stop: () => {
        clearInterval(sampler);
        gcObserver.disconnect();
        eventLoopDelay.disable();
        sampleMemory();

        const endedAt = takeSnapshot();
        previousRunEnd = endedAt;
        const durationMs = endedAt.atMs - startedAt.atMs;
        const cpu = process.cpuUsage(startedAt.cpu);
        const byKind = Object.fromEntries(
          Object.entries(gcByKind).map(([kind, value]) => [
            kind,
            { count: value.count, pauseMs: round(value.pauseMs, 1) },
          ])
        );
        const gcValues = Object.values(gcByKind);

        return {
          durationMs,
          cpu: {
            userMs: Math.round(cpu.user / 1000),
            systemMs: Math.round(cpu.system / 1000),
            cores: durationMs > 0 ? round((cpu.user + cpu.system) / 1000 / durationMs) : 0,
          },
          eventLoop: {
            utilization: round(
              performance.eventLoopUtilization(endedAt.elu, startedAt.elu).utilization
            ),
            delayMs: {
              p50: nanosToMs(eventLoopDelay.percentile(50)),
              p99: nanosToMs(eventLoopDelay.percentile(99)),
              max: nanosToMs(eventLoopDelay.max),
            },
          },
          gc: {
            count: gcValues.reduce((sum, value) => sum + value.count, 0),
            pauseMs: round(
              gcValues.reduce((sum, value) => sum + value.pauseMs, 0),
              1
            ),
            byKind,
          },
          heapMb: {
            start: toMb(memoryAtStart.heapUsed),
            end: toMb(process.memoryUsage().heapUsed),
            peak: toMb(heapPeak),
            limit: toMb(getHeapStatistics().heap_size_limit),
          },
          rssMb: { start: toMb(memoryAtStart.rss), peak: toMb(rssPeak) },
          marks,
          background,
        };
      },
    };
  };

  return { start };
};

export type RunHealthTracker = ReturnType<typeof createRunHealthTracker>;
