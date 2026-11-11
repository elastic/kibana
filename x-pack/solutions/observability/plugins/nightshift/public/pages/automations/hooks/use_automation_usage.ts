/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import datemath from '@elastic/datemath';
import {
  useAutomationsRunCounts,
  useAutomationsRunsInRange,
  type Automation,
} from '../../../data/automations/use_automations';

export interface TimeRange {
  start: string;
  end: string;
}

export interface RunRange {
  startedAfter: string;
  startedBefore: string;
}

const getTodayRange = (now: Date): RunRange => {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startedAfter: start.toISOString(), startedBefore: end.toISOString() };
};

const useTodayUsage = (ids: string[], { startedAfter, startedBefore }: RunRange) => {
  const queries = useAutomationsRunsInRange(ids, startedAfter, startedBefore);
  return new Map(
    ids.flatMap((id, index) => {
      const usedToday = queries[index]?.data?.usedToday;
      return usedToday === undefined ? [] : [[id, usedToday] as const];
    })
  );
};

export type RunCountStatus = 'succeeded' | 'running' | 'failed' | 'skipped';
export type RunCounts = Record<RunCountStatus, number>;

const useRunCounts = (ids: string[], { startedAfter, startedBefore }: RunRange) => {
  const counts = useAutomationsRunCounts(ids, startedAfter, startedBefore);
  return new Map(Object.entries(counts ?? {}));
};

export const useAutomationUsage = (
  automations: Automation[],
  range: TimeRange,
  refreshedAt: number
) => {
  const ids = automations.map(({ id }) => id);
  const { runRange, today } = useMemo(() => {
    const forceNow = new Date(refreshedAt);
    return {
      runRange: {
        startedAfter: datemath.parse(range.start, { forceNow })?.toISOString() ?? range.start,
        startedBefore:
          datemath.parse(range.end, { roundUp: true, forceNow })?.toISOString() ?? range.end,
      },
      today: getTodayRange(forceNow),
    };
  }, [range, refreshedAt]);

  return {
    runRange,
    runCounts: useRunCounts(ids, runRange),
    usedToday: useTodayUsage(ids, today),
  };
};
