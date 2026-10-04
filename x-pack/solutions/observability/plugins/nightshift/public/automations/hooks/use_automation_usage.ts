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

const getTodayRange = (): RunRange => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startedAfter: start.toISOString(), startedBefore: end.toISOString() };
};

const useRunTotals = (ids: string[], { startedAfter, startedBefore }: RunRange) => {
  const queries = useAutomationsRunsInRange(ids, startedAfter, startedBefore);
  return new Map(ids.map((id, index) => [id, queries[index]?.data?.total ?? 0]));
};

export const useAutomationUsage = (automations: Automation[], range: TimeRange) => {
  const ids = automations.map(({ id }) => id);
  const runRange = useMemo(
    () => ({
      startedAfter: datemath.parse(range.start)?.toISOString() ?? range.start,
      startedBefore: datemath.parse(range.end, { roundUp: true })?.toISOString() ?? range.end,
    }),
    [range]
  );
  const today = useMemo(getTodayRange, []);

  return {
    runRange,
    runTotals: useRunTotals(ids, runRange),
    usedToday: useRunTotals(ids, today),
  };
};
