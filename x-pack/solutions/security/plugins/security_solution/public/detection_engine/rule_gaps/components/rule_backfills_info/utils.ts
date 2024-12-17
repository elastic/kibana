/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { BackfillRow, Backfill, BackfillStats } from '../../types';

const getScheduledEntryAmount = (backfill: Backfill): BackfillStats => {
  return backfill?.schedule?.reduce(
    (acc, scheduledEntry) => {
      return {
        ...acc,
        [scheduledEntry.status]: (acc[scheduledEntry.status] ?? 0) + 1,
      };
    },
    {
      total: backfill?.schedule?.length ?? 0,
      complete: 0,
      running: 0,
      pending: 0,
      error: 0,
      timeout: 0,
    }
  );
};

export const getBackfillRowsFromResponse = (backfills: Backfill[]): BackfillRow[] => {
  const backfillRows: BackfillRow[] =
    backfills?.map((backfill) => ({
      ...backfill,
      ...getScheduledEntryAmount(backfill),
    })) ?? [];

  return backfillRows;
};
