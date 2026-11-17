/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InMemoryStateStore } from '../../test_utils/in_memory_state_store';
import { advanceGeneratorState, readGeneratorStates } from './generator_states';

const SPACE_ID = 'default';
const STRATEGY_ID = 'error_rate';

const advance = ({
  state,
  processedUntil,
}: {
  state: InMemoryStateStore;
  processedUntil: number;
}) => advanceGeneratorState({ state, spaceId: SPACE_ID, strategyId: STRATEGY_ID, processedUntil });

const read = async (state: InMemoryStateStore) =>
  (await readGeneratorStates({ state, spaceId: SPACE_ID, strategyIds: [STRATEGY_ID] })).get(
    STRATEGY_ID
  );

describe('advanceGeneratorState', () => {
  it('moves an existing generator state forward, not only the first one', async () => {
    const state = new InMemoryStateStore();
    await advance({ state, processedUntil: 100 });

    await advance({ state, processedUntil: 200 });

    expect(await read(state)).toBe(200);
  });

  it('never moves back, so a late writer cannot undo the progress of a newer run', async () => {
    const state = new InMemoryStateStore();
    await advance({ state, processedUntil: 200 });

    await advance({ state, processedUntil: 100 });

    expect(await read(state)).toBe(200);
  });
});

describe('readGeneratorStates', () => {
  it('leaves out a strategy that never ran', async () => {
    const state = new InMemoryStateStore();
    await advance({ state, processedUntil: 100 });

    const states = await readGeneratorStates({
      state,
      spaceId: SPACE_ID,
      strategyIds: [STRATEGY_ID, 'never_ran'],
    });

    expect([...states.keys()]).toEqual([STRATEGY_ID]);
  });
});
