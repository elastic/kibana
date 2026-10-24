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
  /** Test runs only: which of a resolution page's members have a stored base score. */
  | 'testMemberFill'
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
  /** The pages' wall times added up, so above the stage's wall time when pages overlap. */
  wallMs: number;
  /** Wall time outside every timed step: Kibana work between the steps. */
  untimedMs: number;
  steps: Partial<Record<PageStep, PageStepTotal>>;
}

/** Page 1 runs on cold caches, so it's reported apart from the pages after it. */
export interface PageStepTimingsSummary {
  firstPage?: PageGroupTimings;
  laterPages?: PageGroupTimings;
  /** From the first page's start to the summary. */
  stageWallMs?: number;
  maxPagesInFlight: number;
}

/** Times the steps of one page. */
export interface PageStepRecorder {
  time: <T>(
    step: PageStep,
    run: () => Promise<T>,
    esTookMs?: (result: T) => number | undefined
  ) => Promise<T>;
  timeSync: <T>(step: PageStep, run: () => T) => T;
}

export interface PageTimer extends PageStepRecorder {
  /** Stops the page's clock once its last step is done. */
  end: () => void;
  /** The page doesn't exist. Its time stays in the totals, but it isn't counted. */
  drop: () => void;
}

export interface PageStepTimings {
  /** Starts the next page's clock. Call before the request that discovers the page. */
  startPage: () => PageTimer;
  /** Stops the clock of every page still open and totals every page so far. */
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
 * went with one line. A page runs its steps one after another, so its steps and its untimed
 * remainder add up to its wall time; pages themselves may overlap.
 */
export const createPageStepTimings = (): PageStepTimings => {
  const firstPage: PageGroup = { pages: 0, wallMs: 0, steps: {} };
  const laterPages: PageGroup = { pages: 0, wallMs: 0, steps: {} };
  const openPages = new Set<() => void>();
  let pagesStarted = 0;
  let maxPagesInFlight = 0;
  let stageStartedAt: number | undefined;

  const startPage = (): PageTimer => {
    pagesStarted += 1;
    const group = pagesStarted === 1 ? firstPage : laterPages;
    group.pages += 1;
    const startedAt = performance.now();
    stageStartedAt ??= startedAt;

    const close = () => {
      if (openPages.delete(close)) {
        group.wallMs += performance.now() - startedAt;
      }
    };
    openPages.add(close);
    maxPagesInFlight = Math.max(maxPagesInFlight, openPages.size);

    const record = (step: PageStep, ms: number, esTookMs: number | undefined) => {
      const total = group.steps[step] ?? { ms: 0, calls: 0 };
      group.steps[step] = {
        ms: total.ms + ms,
        calls: total.calls + 1,
        esTookMs: esTookMs === undefined ? total.esTookMs : (total.esTookMs ?? 0) + esTookMs,
      };
    };

    return {
      time: async (step, run, esTookMs) => {
        const stepStartedAt = performance.now();
        const result = await run();
        record(step, performance.now() - stepStartedAt, esTookMs?.(result));
        return result;
      },
      timeSync: (step, run) => {
        const stepStartedAt = performance.now();
        const result = run();
        record(step, performance.now() - stepStartedAt, undefined);
        return result;
      },
      end: close,
      drop: () => {
        group.pages -= 1;
        close();
      },
    };
  };

  return {
    startPage,
    summary: () => {
      for (const close of [...openPages]) {
        close();
      }
      return {
        firstPage: toGroupTimings(firstPage),
        laterPages: toGroupTimings(laterPages),
        stageWallMs:
          stageStartedAt === undefined ? undefined : Math.round(performance.now() - stageStartedAt),
        maxPagesInFlight,
      };
    },
  };
};
