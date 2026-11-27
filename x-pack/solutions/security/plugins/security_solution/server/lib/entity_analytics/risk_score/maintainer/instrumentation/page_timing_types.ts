/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlPageProfileSummary } from './esql_page_profile';

/** Code-defined operation dimensions keep timing aggregates bounded across pages. */
export type PageStepTag =
  | 'discovery'
  | 'member'
  | 'fetch'
  | 'esql'
  | 'parse'
  | 'entity'
  | 'modifiers'
  | 'create'
  | 'risk'
  | 'store'
  | 'write';

export type PageStep = readonly PageStepTag[];

export interface StepTotals {
  tags: PageStep;
  ms: number;
  calls: number;
  failures: number;
  maxMs: number;
  /** Time Elasticsearch reported for the step's requests, for steps whose responses carry `took`. */
  esTookMs?: number;
}

export interface PageStepTotal extends StepTotals {
  /** Estimated median step-invocation duration, using the histogram bucket upper bound. */
  p50Ms: number;
  /** Estimated 95th-percentile step-invocation duration, using the histogram bucket upper bound. */
  p95Ms: number;
}

export interface ProfileTotals {
  samples: number;
  cpuMs?: number;
  tookMs?: number;
  documentsFound?: number;
  valuesLoaded?: number;
}

export interface PageTimingRecord {
  page: number;
  empty: boolean;
  wallMs: number;
  untimedMs: number;
  steps: StepTotals[];
  counters: Partial<Record<PageCounter, number>>;
}

export interface PageGroupTimings {
  pages: number;
  wallMs: number;
  /** Wall time outside every timed step: Kibana work between the steps. */
  untimedMs: number;
  steps: PageStepTotal[];
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
  profiles: { firstPage?: ProfileTotals; laterPages?: ProfileTotals };
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

export interface PageProfilingOptions {
  profile: boolean;
  profileInterval: number;
}
