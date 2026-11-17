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
export async function readGeneratorStates({
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
      generatorState: await state.get({ spaceId, kind: 'generator_state', key: strategyId }),
    }))
  );

  return new Map(
    stored.flatMap(({ strategyId, generatorState }) =>
      generatorState ? [[strategyId, generatorState.value.processed_until] as const] : []
    )
  );
}

/**
 * Moves a strategy's generator state forward. It never moves back, so a late writer cannot undo the
 * progress of a newer run. A conflict is thrown: the caller's lease expired and another node took
 * over, so the caller must stop writing.
 */
export async function advanceGeneratorState({
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
  const current = await state.get({ spaceId, kind: 'generator_state', key: strategyId });

  if (current && current.value.processed_until >= processedUntil) {
    return;
  }

  await state.put({
    spaceId,
    kind: 'generator_state',
    key: strategyId,
    value: { processed_until: processedUntil },
    version: current?.version,
  });
}
