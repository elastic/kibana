/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeGCPerformanceDetail, PerformanceEntry } from 'perf_hooks';
import { constants, monitorEventLoopDelay, PerformanceObserver } from 'perf_hooks';
import { getHeapStatistics } from 'v8';
import type {
  MemorySample,
  MemoryObservations,
  ProcessHealthCollector,
  RunHealthSummary,
} from './run_health_types';

/** Collects memory peaks, GC activity and event-loop delays until the run ends. */
export const startProcessHealthCollection = (): ProcessHealthCollector => {
  const memory = startMemorySampling();
  const eventLoop = startEventLoopMonitoring();
  const garbageCollection = startGcObservation();

  return {
    sampleMemory: memory.sample,
    stop: () => ({
      memory: memory.stop(),
      gc: garbageCollection.stop(),
      eventLoopDelayNs: eventLoop.stop(),
    }),
  };
};

const startMemorySampling = () => {
  const start = process.memoryUsage();
  let peak: MemorySample = start;
  const sample = (): MemorySample => {
    const current = process.memoryUsage();
    peak = mergeMemoryPeaks(peak, current);
    return current;
  };
  const sampler = setInterval(sample, MEMORY_SAMPLE_INTERVAL_MS);
  sampler.unref();

  return {
    sample,
    stop: (): MemoryObservations => {
      clearInterval(sampler);
      const end = sample();
      return { start, end, peak, heapLimit: getHeapStatistics().heap_size_limit };
    },
  };
};

const startEventLoopMonitoring = () => {
  const delays = monitorEventLoopDelay({ resolution: 20 });
  delays.enable();
  return {
    stop: () => {
      delays.disable();
      return { p50: delays.percentile(50), p99: delays.percentile(99), max: delays.max };
    },
  };
};

const startGcObservation = () => {
  let totalsByKind: RunHealthSummary['gc']['byKind'] = {};
  const recordEntries = (entries: PerformanceEntry[]) => {
    totalsByKind = entries.reduce(addGcEntry, totalsByKind);
  };
  const observer = new PerformanceObserver((list) => recordEntries(list.getEntries()));
  observer.observe({ entryTypes: ['gc'] });

  return {
    stop: (): RunHealthSummary['gc'] => {
      recordEntries(observer.takeRecords());
      observer.disconnect();
      return summarizeGcActivity(totalsByKind);
    },
  };
};

const mergeMemoryPeaks = (peak: MemorySample, current: MemorySample): MemorySample => ({
  heapUsed: Math.max(peak.heapUsed, current.heapUsed),
  rss: Math.max(peak.rss, current.rss),
  external: Math.max(peak.external, current.external),
  arrayBuffers: Math.max(peak.arrayBuffers, current.arrayBuffers),
});

const addGcEntry = (
  totalsByKind: RunHealthSummary['gc']['byKind'],
  entry: PerformanceEntry
): RunHealthSummary['gc']['byKind'] => {
  const kind = gcKindName(entry);
  const previous = totalsByKind[kind] ?? { count: 0, pauseMs: 0 };
  return {
    ...totalsByKind,
    [kind]: { count: previous.count + 1, pauseMs: previous.pauseMs + entry.duration },
  };
};

const summarizeGcActivity = (
  totalsByKind: RunHealthSummary['gc']['byKind']
): RunHealthSummary['gc'] => ({
  count: Object.values(totalsByKind).reduce((count, group) => count + group.count, 0),
  pauseMs: roundPause(
    Object.values(totalsByKind).reduce((pauseMs, group) => pauseMs + group.pauseMs, 0)
  ),
  byKind: Object.fromEntries(
    Object.entries(totalsByKind).map(([kind, { count, pauseMs }]) => [
      kind,
      { count, pauseMs: roundPause(pauseMs) },
    ])
  ),
});

const gcKindName = ({ detail }: PerformanceEntry & { detail?: NodeGCPerformanceDetail }): string =>
  detail?.kind === undefined ? 'other' : GC_KIND_NAMES[detail.kind] ?? 'other';

const roundPause = (pauseMs: number): number => Number(pauseMs.toFixed(1));
const MEMORY_SAMPLE_INTERVAL_MS = 1000;
const GC_KIND_NAMES: Record<number, string> = {
  [constants.NODE_PERFORMANCE_GC_MAJOR]: 'major',
  [constants.NODE_PERFORMANCE_GC_MINOR]: 'minor',
  [constants.NODE_PERFORMANCE_GC_INCREMENTAL]: 'incremental',
  [constants.NODE_PERFORMANCE_GC_WEAKCB]: 'weakcb',
};
