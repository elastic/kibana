/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { EsqlPageProfileSummary } from './esql_page_profile';
import { shouldProfilePage, ESQL_PROFILE_PAGE_INTERVAL } from './esql_page_profile';
import {
  addStepObservation,
  createPageTimingGroup,
  roundStepTotals,
  untimedDuration,
} from './page_timing_group';
import type {
  PageStep,
  PageStepTimings,
  PageStepTimingsSummary,
  PageTimingRecord,
  ProfileTotals,
  StepTotals,
} from './page_timing_types';

interface PageTimingOptions {
  profile?: boolean;
  profileInterval?: number;
  onPage?: (record: PageTimingRecord) => void;
  onProfile?: (page: number, summary: EsqlPageProfileSummary) => void;
}

/** Emits completed page observations and retains fixed-size stage aggregates. */
export const createPageStepTimings = ({
  profile = true,
  profileInterval = ESQL_PROFILE_PAGE_INTERVAL,
  onPage,
  onProfile,
}: PageTimingOptions = {}): PageStepTimings => {
  const state: TimingState = {
    counters: {},
    profiles: {},
    groups: { firstPage: createPageTimingGroup(), laterPages: createPageTimingGroup() },
    pageNumber: 0,
  };
  return {
    startPage: () => {
      finishPage(state, onPage);
      state.pageNumber += 1;
      state.page = {
        page: state.pageNumber,
        empty: false,
        startedAt: performance.now(),
        wallMs: 0,
        untimedMs: 0,
        steps: {},
        counters: {},
      };
    },
    dropPage: () => {
      if (state.page) state.page.empty = true;
    },
    count: (counter, value) => {
      state.counters[counter] = (state.counters[counter] ?? 0) + value;
      if (state.page) state.page.counters[counter] = (state.page.counters[counter] ?? 0) + value;
    },
    setStamped: (value) => {
      state.stamped = value;
    },
    shouldProfile: () => profile && shouldProfilePage(state.pageNumber, profileInterval),
    recordProfile: (summary) => {
      const name = groupName(state.pageNumber);
      state.profiles[name] = addProfileObservation(state.profiles[name], summary);
      onProfile?.(state.pageNumber, summary);
    },
    time: async (step, run, esTookMs) => {
      const startedAt = performance.now();
      let failed = false;
      let took: number | undefined;
      try {
        const result = await run();
        took = esTookMs?.(result);
        return result;
      } catch (error) {
        failed = true;
        throw error;
      } finally {
        recordStep(state, step, performance.now() - startedAt, took, failed);
      }
    },
    timeSync: (step, run) => {
      const startedAt = performance.now();
      let failed = false;
      try {
        return run();
      } catch (error) {
        failed = true;
        throw error;
      } finally {
        recordStep(state, step, performance.now() - startedAt, undefined, failed);
      }
    },
    summary: () => {
      finishPage(state, onPage);
      return {
        firstPage: state.groups.firstPage.summary(),
        laterPages: state.groups.laterPages.summary(),
        counters: { ...state.counters },
        profiles: { ...state.profiles },
        stamped: state.stamped,
      };
    },
  };
};

interface TimingState {
  counters: PageStepTimingsSummary['counters'];
  profiles: PageStepTimingsSummary['profiles'];
  groups: Record<'firstPage' | 'laterPages', ReturnType<typeof createPageTimingGroup>>;
  pageNumber: number;
  stamped?: boolean;
  page?: Omit<PageTimingRecord, 'steps'> & { startedAt: number; steps: Record<string, StepTotals> };
}

const finishPage = (state: TimingState, onPage: PageTimingOptions['onPage']) => {
  if (state.page) {
    const { startedAt, ...record } = state.page;
    const wallMs = performance.now() - startedAt;
    const steps = Object.values(record.steps);
    state.groups[groupName(state.pageNumber)].finishPage(wallMs, !record.empty);
    state.page = undefined;
    onPage?.({
      ...record,
      wallMs: Math.round(wallMs),
      untimedMs: untimedDuration(wallMs, steps),
      steps: steps.map(roundStepTotals),
    });
  }
};

const recordStep = (
  state: TimingState,
  tags: PageStep,
  ms: number,
  took: number | undefined,
  failed: boolean
) => {
  const normalizedTags = [...new Set(tags)].sort();
  const step = normalizedTags.join('::');
  state.groups[groupName(state.pageNumber)].record(normalizedTags, ms, took, failed);
  if (state.page) {
    state.page.steps[step] = addStepObservation(
      state.page.steps[step],
      normalizedTags,
      ms,
      took,
      failed
    );
  }
};

const groupName = (pageNumber: number) => (pageNumber <= 1 ? 'firstPage' : 'laterPages');

const addProfileObservation = (
  total: ProfileTotals | undefined,
  summary: EsqlPageProfileSummary
): ProfileTotals => ({
  samples: (total?.samples ?? 0) + 1,
  ...Object.fromEntries(
    (['cpuMs', 'tookMs', 'documentsFound', 'valuesLoaded'] as const).flatMap((field) => {
      const value = summary[field];
      const previous = total?.[field];
      return value === undefined && previous === undefined
        ? []
        : [[field, (previous ?? 0) + (value ?? 0)]];
    })
  ),
});
