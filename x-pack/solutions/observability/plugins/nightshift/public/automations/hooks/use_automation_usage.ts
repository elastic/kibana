/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import datemath from '@elastic/datemath';
import { useAutomationsRunsInRange, type Automation } from './use_automations';

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

const useRunTotals = (ids: string[], { startedAfter, startedBefore }: RunRange) => {
  const queries = useAutomationsRunsInRange(ids, startedAfter, startedBefore);
  return new Map(
    ids.flatMap((id, index) => {
      const total = queries[index]?.data?.total;
      return total === undefined ? [] : [[id, total] as const];
    })
  );
};

export type RunCountStatus = 'succeeded' | 'failed' | 'skipped';
export type RunCounts = Record<RunCountStatus, number>;

const useRunCounts = (ids: string[], { startedAfter, startedBefore }: RunRange) => {
  const queries = useAutomationsRunsInRange(ids, startedAfter, startedBefore);
  return new Map(
    ids.flatMap((id, index) => {
      const runs = queries[index]?.data?.runs;
      if (!runs) return [];
      const count = (status: RunCountStatus) => runs.filter((run) => run.status === status).length;
      return [
        [id, { succeeded: count('succeeded'), failed: count('failed'), skipped: count('skipped') }],
      ] as const;
    })
  );
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
    usedToday: useRunTotals(ids, today),
  };
};
