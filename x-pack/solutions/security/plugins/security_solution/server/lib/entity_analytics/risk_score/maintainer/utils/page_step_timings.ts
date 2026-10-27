/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { EsqlPageProfileSummary } from './esql_page_profile';
import { shouldProfilePage } from './esql_page_profile';

/** Page operations include client serialization and response decoding in their request duration. */
export type PageStep =
  | 'discovery'
  | 'memberFetch'
  | 'esql'
  | 'parse'
  | 'entityFetch'
  | 'modifiers'
  | 'entityCreation'
  | 'riskWrite'
  | 'storeWrite';

export interface PageStepTotal {
  ms: number;
  calls: number;
  failures: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  /** Time Elasticsearch reported for the step's requests, for steps whose responses carry `took`. */
  esTookMs?: number;
}

export interface PageGroupTimings {
  pages: number;
  wallMs: number;
  /** Wall time outside every timed step: Kibana work between the steps. */
  untimedMs: number;
  steps: Partial<Record<PageStep, PageStepTotal>>;
}

export type PageCounter =
  | 'esqlRows'
  | 'partialResponses'
  | 'riskDocumentsWritten'
  | 'riskWriteFailures'
  | 'storeDocumentsWritten'
  | 'storeWriteFailures'
  | 'memberFilterPages'
  | 'memberFilterFallbackPages'
  | 'entityFetchFailures'
  | 'scoresCalculated'
  | 'scoresMissingFromStore'
  | 'scoresDroppedNotInStore'
  | 'entitiesCreated'
  | 'entityCreationsSkipped'
  | 'entityCreationsFailed'
  | 'pagesProcessed';

export interface PageStepTimingsSummary {
  counters: Partial<Record<PageCounter, number>>;
  profiles: Array<{ page: number; summary: EsqlPageProfileSummary }>;
  stamped?: boolean;
  firstPage?: PageGroupTimings;
  laterPages?: PageGroupTimings;
}

export interface PageStepTimings {
  count: (counter: PageCounter, value: number) => void;
  setStamped: (value: boolean) => void;
  shouldProfile: () => boolean;
  recordProfile: (summary: EsqlPageProfileSummary) => void;
  /** Starts the next page's clock. Call before the request that discovers the page. */
  startPage: () => void;
  /** Records an empty terminal page with its elapsed time and zero scored pages. */
  dropPage: () => void;
  time: <T>(
    step: PageStep,
    run: () => Promise<T>,
    esTookMs?: (result: T) => number | undefined
  ) => Promise<T>;
  timeSync: <T>(step: PageStep, run: () => T) => T;
  /** Stops the clock of the page in progress and totals every page so far. */
  summary: () => PageStepTimingsSummary;
}

interface PageGroup {
  pages: number;
  wallMs: number;
  steps: Partial<Record<PageStep, PageStepTotal>>;
  histograms: Partial<Record<PageStep, Float64Array>>;
}

// 256 buckets retain bounded duration distributions with eight buckets per doubling of (ms + 1).
const percentile = (
  buckets: Float64Array | undefined,
  total: PageStepTotal,
  fraction: number
): number => {
  if (!buckets) return 0;
  const rank = Math.ceil(total.calls * fraction);
  let count = 0;
  for (let index = 0; index < buckets.length; index++) {
    count += buckets[index];
    if (count >= rank) return Math.round(Math.min(total.maxMs, 2 ** (index / 8) - 1));
  }
  return Math.round(total.maxMs);
};

const toGroupTimings = ({
  pages,
  wallMs,
  steps,
  histograms,
}: PageGroup): PageGroupTimings | undefined => {
  const totals = Object.values(steps);
  if (pages === 0 && totals.length === 0) {
    return undefined;
  }
  const timedMs = totals.reduce((sum, { ms }) => sum + ms, 0);
  return {
    pages,
    wallMs: Math.round(wallMs),
    untimedMs: Math.max(0, Math.round(wallMs - timedMs)),
    steps: Object.fromEntries(
      Object.entries(steps).map(([step, total]) => [
        step,
        {
          ms: Math.round(total.ms),
          calls: total.calls,
          failures: total.failures,
          maxMs: Math.round(total.maxMs),
          p50Ms: percentile(histograms[step as PageStep], total, 0.5),
          p95Ms: percentile(histograms[step as PageStep], total, 0.95),
          ...(total.esTookMs !== undefined ? { esTookMs: Math.round(total.esTookMs) } : {}),
        },
      ])
    ),
  };
};

/** Aggregates sequential page timings with separate first-page and subsequent-page summaries. */
export const createPageStepTimings = ({
  profile = false,
}: { profile?: boolean } = {}): PageStepTimings => {
  const counters: PageStepTimingsSummary['counters'] = {};
  const profiles: PageStepTimingsSummary['profiles'] = [];
  let stamped: boolean | undefined;
  const firstPage: PageGroup = { pages: 0, wallMs: 0, steps: {}, histograms: {} };
  const laterPages: PageGroup = { pages: 0, wallMs: 0, steps: {}, histograms: {} };
  let pageNumber = 0;
  let pageStartedAt: number | undefined;

  const currentGroup = () => (pageNumber <= 1 ? firstPage : laterPages);

  const stopPageClock = () => {
    if (pageStartedAt !== undefined) {
      currentGroup().wallMs += performance.now() - pageStartedAt;
      pageStartedAt = undefined;
    }
  };

  const record = (step: PageStep, ms: number, esTookMs: number | undefined, failed = false) => {
    const group = currentGroup();
    const total = group.steps[step] ?? {
      ms: 0,
      calls: 0,
      failures: 0,
      maxMs: 0,
      p50Ms: 0,
      p95Ms: 0,
    };
    const buckets = group.histograms[step] ?? new Float64Array(256);
    buckets[Math.min(255, Math.max(0, Math.ceil(Math.log2(ms + 1) * 8)))] += 1;
    group.histograms[step] = buckets;
    group.steps[step] = {
      ms: total.ms + ms,
      calls: total.calls + 1,
      failures: total.failures + Number(failed),
      maxMs: Math.max(total.maxMs, ms),
      p50Ms: 0,
      p95Ms: 0,
      esTookMs: esTookMs === undefined ? total.esTookMs : (total.esTookMs ?? 0) + esTookMs,
    };
  };

  return {
    count: (counter, value) => {
      counters[counter] = (counters[counter] ?? 0) + value;
    },
    setStamped: (value) => {
      stamped = value;
    },
    shouldProfile: () => profile && shouldProfilePage(pageNumber),
    recordProfile: (summary) => {
      if (profiles.length < 5) profiles.push({ page: pageNumber, summary });
    },
    startPage: () => {
      stopPageClock();
      pageNumber += 1;
      currentGroup().pages += 1;
      pageStartedAt = performance.now();
    },
    dropPage: () => {
      currentGroup().pages -= 1;
    },
    time: async (step, run, esTookMs) => {
      const startedAt = performance.now();
      let failed = true;
      let took: number | undefined;
      try {
        const result = await run();
        took = esTookMs?.(result);
        failed = false;
        return result;
      } finally {
        record(step, performance.now() - startedAt, took, failed);
      }
    },
    timeSync: (step, run) => {
      const startedAt = performance.now();
      let failed = true;
      try {
        const result = run();
        failed = false;
        return result;
      } finally {
        record(step, performance.now() - startedAt, undefined, failed);
      }
    },
    summary: () => {
      stopPageClock();
      return {
        firstPage: toGroupTimings(firstPage),
        laterPages: toGroupTimings(laterPages),
        counters: { ...counters },
        profiles: [...profiles],
        stamped,
      };
    },
  };
};
