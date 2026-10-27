/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDurationHistogram } from './duration_histogram';
import type { PageGroupTimings, PageStep, StepTotals } from './page_timing_types';

/** Accumulates bounded step distributions for one group of sequential pages. */
export const createPageTimingGroup = () => {
  let pages = 0;
  let wallMs = 0;
  const steps: Partial<Record<PageStep, StepTotals>> = {};
  const histograms: Partial<Record<PageStep, ReturnType<typeof createDurationHistogram>>> = {};
  return {
    finishPage: (durationMs: number, scored: boolean) => {
      pages += Number(scored);
      wallMs += durationMs;
    },
    record: (step: PageStep, ms: number, took: number | undefined, failed: boolean) => {
      steps[step] = addStepObservation(steps[step], ms, took, failed);
      const histogram = histograms[step] ?? createDurationHistogram();
      histogram.record(ms);
      histograms[step] = histogram;
    },
    summary: (): PageGroupTimings | undefined => {
      if (pages === 0 && Object.keys(steps).length === 0) return undefined;
      return {
        pages,
        wallMs: Math.round(wallMs),
        untimedMs: untimedDuration(wallMs, steps),
        steps: Object.fromEntries(
          Object.entries(steps).map(([step, total]) => [
            step,
            {
              ...roundStepTotals(total),
              p50Ms: histograms[step as PageStep]?.percentile(0.5) ?? 0,
              p95Ms: histograms[step as PageStep]?.percentile(0.95) ?? 0,
            },
          ])
        ),
      };
    },
  };
};

export const addStepObservation = (
  total: StepTotals | undefined,
  ms: number,
  took: number | undefined,
  failed: boolean
): StepTotals => ({
  ms: (total?.ms ?? 0) + ms,
  calls: (total?.calls ?? 0) + 1,
  failures: (total?.failures ?? 0) + Number(failed),
  maxMs: Math.max(total?.maxMs ?? 0, ms),
  esTookMs: took === undefined ? total?.esTookMs : (total?.esTookMs ?? 0) + took,
});

export const roundStepTotals = (total: StepTotals): StepTotals => ({
  ...total,
  ms: Math.round(total.ms),
  maxMs: Math.round(total.maxMs),
  ...(total.esTookMs !== undefined ? { esTookMs: Math.round(total.esTookMs) } : {}),
});

export const untimedDuration = (
  wallMs: number,
  steps: Partial<Record<PageStep, StepTotals>>
): number =>
  Math.max(0, Math.round(wallMs - Object.values(steps).reduce((sum, step) => sum + step.ms, 0)));
