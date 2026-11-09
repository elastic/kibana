/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PerformanceMeasurement as Measurement } from './events';
import type { PageGroupTimings, PageStepTimingsSummary, ProfileTotals } from './page_timing_types';
import type { RunHealthSummary } from './run_health';

export const pageTimingMeasurements = (summary: PageStepTimingsSummary): Measurement[] => {
  const measurements = {
    timing: (['firstPage', 'laterPages'] as const).flatMap((name) =>
      groupMeasurements(name, summary[name])
    ),
    counter: Object.entries(summary.counters).map(
      ([name, value]): Measurement => ({ name, value, unit: 'count' })
    ),
    paging:
      summary.stamped === undefined
        ? []
        : [{ name: 'stamped', value: Number(summary.stamped), unit: 'count' }],
    profile: (['firstPage', 'laterPages'] as const).flatMap((name) =>
      profileMeasurements(name, summary.profiles[name])
    ),
  } satisfies Record<string, Measurement[]>;
  return measurements.timing.concat(
    measurements.counter,
    measurements.paging,
    measurements.profile
  );
};

export const runHealthMeasurements = (health: RunHealthSummary): Measurement[] => {
  const measurements = {
    cpu: [
      { name: 'process.cpu.user', value: health.cpu.userMs, unit: 'ms' },
      { name: 'process.cpu.system', value: health.cpu.systemMs, unit: 'ms' },
    ],
    eventLoop: [
      { name: 'process.eventLoop.utilization', value: health.eventLoop.utilization, unit: 'ratio' },
      ...Object.entries(health.eventLoop.delayMs).map(
        ([name, value]): Measurement => ({
          name: `process.eventLoop.delay.${name}`,
          value,
          unit: 'ms',
        })
      ),
    ],
    gc: [
      { name: 'process.gc.count', value: health.gc.count, unit: 'count' },
      { name: 'process.gc.pause', value: health.gc.pauseMs, unit: 'ms' },
    ],
    concurrency: [
      { name: 'concurrentRunsAtStart', value: health.concurrentRunsAtStart, unit: 'count' },
    ],
    memory: (['heapMb', 'rssMb', 'externalMb', 'arrayBuffersMb'] as const).flatMap((name) =>
      Object.entries(health[name]).map(
        ([point, value]): Measurement => ({ name: `process.${name}.${point}`, value, unit: 'MiBy' })
      )
    ),
  } satisfies Record<string, Measurement[]>;
  return measurements.memory.concat(
    measurements.cpu,
    measurements.eventLoop,
    measurements.gc,
    measurements.concurrency
  );
};

const groupMeasurements = (name: string, group: PageGroupTimings | undefined): Measurement[] => {
  if (!group) return [];
  const measurements = {
    page: [
      { name: `${name}.pages`, value: group.pages, unit: 'count' },
      { name: `${name}.wall`, value: group.wallMs, unit: 'ms' },
      { name: `${name}.untimed`, value: group.untimedMs, unit: 'ms' },
    ],
    step: group.steps.flatMap((total) =>
      (
        [
          ['ms', 'ms'],
          ['calls', 'count'],
          ['failures', 'count'],
          ['maxMs', 'ms'],
          ['p50Ms', 'ms'],
          ['p95Ms', 'ms'],
          ['esTookMs', 'ms'],
        ] as const
      ).flatMap(([field, unit]): Measurement[] => {
        const value = total[field];
        return value === undefined
          ? []
          : [{ name: `${name}.steps.${field}`, tags: total.tags, value, unit }];
      })
    ),
  } satisfies Record<string, Measurement[]>;
  return measurements.step.concat(measurements.page);
};

const profileMeasurements = (name: string, profile: ProfileTotals | undefined): Measurement[] => {
  if (!profile) return [];
  return (
    [
      ['samples', 'count'],
      ['cpuMs', 'ms'],
      ['tookMs', 'ms'],
      ['documentsFound', 'count'],
      ['valuesLoaded', 'count'],
    ] as const
  ).flatMap(([field, unit]): Measurement[] => {
    const value = profile[field];
    return value === undefined ? [] : [{ name: `${name}.profiles.${field}`, value, unit }];
  });
};
