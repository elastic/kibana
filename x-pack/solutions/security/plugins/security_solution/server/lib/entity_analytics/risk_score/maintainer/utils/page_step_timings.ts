/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';

/**
 * The work a scoring page does. A request step's time covers Kibana's side of the request too,
 * such as serializing the body and parsing the response JSON.
 */
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

/** Page 1 runs on cold caches, so it's reported apart from the pages after it. */
export interface PageStepTimingsSummary {
  firstPage?: PageGroupTimings;
  laterPages?: PageGroupTimings;
}

export interface PageStepTimings {
  /** Starts the next page's clock. Call before the request that discovers the page. */
  startPage: () => void;
  /** The last started page doesn't exist. Its time stays in the totals, but it isn't counted. */
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
}

const toGroupTimings = ({ pages, wallMs, steps }: PageGroup): PageGroupTimings | undefined => {
  const totals = Object.values(steps);
  if (pages === 0 && totals.length === 0) {
    return undefined;
  }
  const timedMs = totals.reduce((sum, { ms }) => sum + ms, 0);
  return {
    pages,
    wallMs: Math.round(wallMs),
    untimedMs: Math.round(wallMs - timedMs),
    steps: Object.fromEntries(
      Object.entries(steps).map(([step, total]) => [
        step,
        {
          ms: Math.round(total.ms),
          calls: total.calls,
          ...(total.esTookMs !== undefined ? { esTookMs: Math.round(total.esTookMs) } : {}),
        },
      ])
    ),
  };
};

/**
 * Totals the wall time of each step over a stage's pages, so a stage can report where its time
 * went with one line. Pages run their steps one after another, so a page's steps and its untimed
 * remainder add up to its wall time.
 */
export const createPageStepTimings = (): PageStepTimings => {
  const firstPage: PageGroup = { pages: 0, wallMs: 0, steps: {} };
  const laterPages: PageGroup = { pages: 0, wallMs: 0, steps: {} };
  let pageNumber = 0;
  let pageStartedAt: number | undefined;

  const currentGroup = () => (pageNumber <= 1 ? firstPage : laterPages);

  const stopPageClock = () => {
    if (pageStartedAt !== undefined) {
      currentGroup().wallMs += performance.now() - pageStartedAt;
      pageStartedAt = undefined;
    }
  };

  const record = (step: PageStep, ms: number, esTookMs: number | undefined) => {
    const group = currentGroup();
    const total = group.steps[step] ?? { ms: 0, calls: 0 };
    group.steps[step] = {
      ms: total.ms + ms,
      calls: total.calls + 1,
      esTookMs: esTookMs === undefined ? total.esTookMs : (total.esTookMs ?? 0) + esTookMs,
    };
  };

  return {
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
      const result = await run();
      record(step, performance.now() - startedAt, esTookMs?.(result));
      return result;
    },
    timeSync: (step, run) => {
      const startedAt = performance.now();
      const result = run();
      record(step, performance.now() - startedAt, undefined);
      return result;
    },
    summary: () => {
      stopPageClock();
      return { firstPage: toGroupTimings(firstPage), laterPages: toGroupTimings(laterPages) };
    },
  };
};
