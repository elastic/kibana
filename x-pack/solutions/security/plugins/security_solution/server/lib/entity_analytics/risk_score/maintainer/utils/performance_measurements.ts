/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';
import type { PageStepTimingsSummary } from './page_step_timings';
import type { RunHealthSummary } from './run_health';

type Report = Parameters<
  Parameters<RegisterEntityMaintainerConfig['run']>[0]['telemetry']['report']
>[0];
type Measurement = NonNullable<Report['measurements']>[number];

export const pageTimingMeasurements = (summary: PageStepTimingsSummary): Measurement[] => {
  const result: Measurement[] = [];
  for (const groupName of ['firstPage', 'laterPages'] as const) {
    const group = summary[groupName];
    if (group) {
      result.push(
        { name: `${groupName}.pages`, value: group.pages, unit: 'count' },
        { name: `${groupName}.wall`, value: group.wallMs, unit: 'ms' },
        { name: `${groupName}.untimed`, value: group.untimedMs, unit: 'ms' }
      );
      for (const [step, total] of Object.entries(group.steps)) {
        for (const [field, unit] of [
          ['ms', 'ms'],
          ['calls', 'count'],
          ['failures', 'count'],
          ['maxMs', 'ms'],
          ['p50Ms', 'ms'],
          ['p95Ms', 'ms'],
          ['esTookMs', 'ms'],
        ] as const) {
          const value = total[field];
          if (value !== undefined)
            result.push({ name: `${groupName}.${step}.${field}`, value, unit });
        }
      }
    }
  }
  for (const [name, value] of Object.entries(summary.counters)) {
    result.push({ name, value, unit: 'count' });
  }
  if (summary.stamped !== undefined)
    result.push({ name: 'stamped', value: Number(summary.stamped), unit: 'count' });
  result.push({ name: 'profileSamples', value: summary.profiles.length, unit: 'count' });
  for (const group of ['firstPage', 'laterPages'] as const) {
    const profiles = summary.profiles.filter(({ page }) =>
      group === 'firstPage' ? page === 1 : page > 1
    );
    for (const [field, unit] of [
      ['cpuMs', 'ms'],
      ['tookMs', 'ms'],
      ['documentsFound', 'count'],
      ['valuesLoaded', 'count'],
    ] as const) {
      const samples = profiles.flatMap(({ summary: profile }) => {
        const value = profile[field];
        return value === undefined ? [] : [value];
      });
      if (samples.length > 0)
        result.push({
          name: `${group}.profiles.${field}`,
          value: samples.reduce((sum, value) => sum + value, 0),
          unit,
        });
    }
  }
  return result;
};

export const runHealthMeasurements = (health: RunHealthSummary): Measurement[] => {
  const result: Measurement[] = [
    { name: 'process.cpu.user', value: health.cpu.userMs, unit: 'ms' },
    { name: 'process.cpu.system', value: health.cpu.systemMs, unit: 'ms' },
    { name: 'process.eventLoop.utilization', value: health.eventLoop.utilization, unit: 'ratio' },
    { name: 'process.gc.count', value: health.gc.count, unit: 'count' },
    { name: 'process.gc.pause', value: health.gc.pauseMs, unit: 'ms' },
    { name: 'concurrentRunsAtStart', value: health.concurrentRunsAtStart, unit: 'count' },
  ];
  for (const [name, value] of Object.entries(health.eventLoop.delayMs)) {
    result.push({ name: `process.eventLoop.delay.${name}`, value, unit: 'ms' });
  }
  for (const name of ['heapMb', 'rssMb', 'externalMb', 'arrayBuffersMb'] as const) {
    for (const [point, value] of Object.entries(health[name])) {
      result.push({ name: `process.${name}.${point}`, value, unit: 'MiBy' });
    }
  }
  return result;
};
