/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventLoopUtilization, PerformanceEntry } from 'perf_hooks';
import { constants, monitorEventLoopDelay, performance, PerformanceObserver } from 'perf_hooks';
import { getHeapStatistics } from 'v8';

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

interface ProcessSnapshot {
  atMs: number;
  cpu: NodeJS.CpuUsage;
  elu: EventLoopUtilization;
}

export interface RunHealthTracker {
  start: () => RunHealthMonitor;
}

/** Measures process health during calculation windows and the gaps between them. */
export const createRunHealthTracker = (): RunHealthTracker => {
  let previousRunEnd: ProcessSnapshot | undefined;
  let activeRuns = 0;

  const start = (): RunHealthMonitor => {
    const startedAt = takeSnapshot();
    const concurrentRunsAtStart = activeRuns++;
    const background =
      previousRunEnd && concurrentRunsAtStart === 0
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
    let externalPeak = memoryAtStart.external;
    let arrayBuffersPeak = memoryAtStart.arrayBuffers;
    const sampleMemory = () => {
      const { heapUsed, rss, external, arrayBuffers } = process.memoryUsage();
      heapPeak = Math.max(heapPeak, heapUsed);
      rssPeak = Math.max(rssPeak, rss);
      externalPeak = Math.max(externalPeak, external);
      arrayBuffersPeak = Math.max(arrayBuffersPeak, arrayBuffers);
    };
    const sampler = setInterval(sampleMemory, HEAP_SAMPLE_INTERVAL_MS);
    sampler.unref();

    const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
    eventLoopDelay.enable();

    const gcByKind: Record<string, { count: number; pauseMs: number }> = {};
    const recordGc = (entries: PerformanceEntry[]) => {
      for (const entry of entries) {
        const kind = gcKindName(entry);
        const current = gcByKind[kind] ?? { count: 0, pauseMs: 0 };
        gcByKind[kind] = { count: current.count + 1, pauseMs: current.pauseMs + entry.duration };
      }
    };
    const gcObserver = new PerformanceObserver((list) => recordGc(list.getEntries()));
    gcObserver.observe({ entryTypes: ['gc'] });

    const marks: RunHealthSummary['marks'] = [];
    let summary: RunHealthSummary | undefined;

    return {
      mark: (name) => {
        if (summary) return;
        sampleMemory();
        const { heapUsed } = process.memoryUsage();
        heapPeak = Math.max(heapPeak, heapUsed);
        marks.push({ name, atMs: performance.now() - startedAt.atMs, heapUsedMb: toMb(heapUsed) });
      },
      stop: () => {
        if (summary) return summary;
        clearInterval(sampler);
        recordGc(gcObserver.takeRecords());
        gcObserver.disconnect();
        eventLoopDelay.disable();
        sampleMemory();

        const endedAt = takeSnapshot();
        activeRuns -= 1;
        if (activeRuns === 0) previousRunEnd = endedAt;
        const durationMs = endedAt.atMs - startedAt.atMs;
        const cpu = process.cpuUsage(startedAt.cpu);
        const byKind = Object.fromEntries(
          Object.entries(gcByKind).map(([kind, value]) => [
            kind,
            { count: value.count, pauseMs: round(value.pauseMs, 1) },
          ])
        );
        const gcValues = Object.values(gcByKind);

        const memoryAtEnd = process.memoryUsage();
        summary = {
          durationMs: Math.round(durationMs),
          concurrentRunsAtStart,
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
          externalMb: {
            start: toMb(memoryAtStart.external),
            end: toMb(memoryAtEnd.external),
            peak: toMb(externalPeak),
          },
          arrayBuffersMb: {
            start: toMb(memoryAtStart.arrayBuffers),
            end: toMb(memoryAtEnd.arrayBuffers),
            peak: toMb(arrayBuffersPeak),
          },
          marks,
          background,
        };
        return summary;
      },
    };
  };

  return { start };
};

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

const gcKindName = (entry: PerformanceEntry): string => {
  if ('detail' in entry && typeof entry.detail === 'object' && entry.detail !== null) {
    if ('kind' in entry.detail && typeof entry.detail.kind === 'number') {
      return GC_KIND_NAMES[entry.detail.kind] ?? 'other';
    }
  }
  return 'other';
};

const takeSnapshot = (): ProcessSnapshot => ({
  atMs: performance.now(),
  cpu: process.cpuUsage(),
  elu: performance.eventLoopUtilization(),
});
