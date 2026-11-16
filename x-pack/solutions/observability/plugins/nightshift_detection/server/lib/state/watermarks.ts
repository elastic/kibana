/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateStore } from './state_store';

/**
 * The end of the last fully processed minute of each strategy, in epoch milliseconds. A strategy
 * that never ran is absent.
 */
export async function readWatermarks({
  state,
  spaceId,
  strategyIds,
}: {
  state: StateStore;
  spaceId: string;
  strategyIds: string[];
}): Promise<Map<string, number>> {
  const stored = await Promise.all(
    strategyIds.map(async (strategyId) => ({
      strategyId,
      watermark: await state.get({ spaceId, kind: 'watermark', key: strategyId }),
    }))
  );

  return new Map(
    stored.flatMap(({ strategyId, watermark }) =>
      watermark ? [[strategyId, watermark.value.processed_until] as const] : []
    )
  );
}

/**
 * Moves a strategy's watermark forward. It never moves back, so a late writer cannot undo the
 * progress of a newer run. The caller holds the run lease, so a conflict means a bug and is
 * thrown.
 */
export async function advanceWatermark({
  state,
  spaceId,
  strategyId,
  processedUntil,
}: {
  state: StateStore;
  spaceId: string;
  strategyId: string;
  processedUntil: number;
}): Promise<void> {
  const current = await state.get({ spaceId, kind: 'watermark', key: strategyId });

  if (current && current.value.processed_until >= processedUntil) {
    return;
  }

  await state.put({
    spaceId,
    kind: 'watermark',
    key: strategyId,
    value: { processed_until: processedUntil },
    version: current?.version,
  });
}
