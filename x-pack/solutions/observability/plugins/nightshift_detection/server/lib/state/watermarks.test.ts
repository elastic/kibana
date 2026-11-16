/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InMemoryStateStore } from '../../test_utils/in_memory_state_store';
import { advanceWatermark, readWatermarks } from './watermarks';

const SPACE_ID = 'default';
const STRATEGY_ID = 'error_rate';

describe('advanceWatermark', () => {
  it('never moves back, so a late writer cannot undo the progress of a newer run', async () => {
    const state = new InMemoryStateStore();
    await advanceWatermark({
      state,
      spaceId: SPACE_ID,
      strategyId: STRATEGY_ID,
      processedUntil: 200,
    });

    await advanceWatermark({
      state,
      spaceId: SPACE_ID,
      strategyId: STRATEGY_ID,
      processedUntil: 100,
    });

    const watermarks = await readWatermarks({
      state,
      spaceId: SPACE_ID,
      strategyIds: [STRATEGY_ID],
    });
    expect(watermarks.get(STRATEGY_ID)).toBe(200);
  });
});

describe('readWatermarks', () => {
  it('leaves out a strategy that never ran', async () => {
    const state = new InMemoryStateStore();
    await advanceWatermark({
      state,
      spaceId: SPACE_ID,
      strategyId: STRATEGY_ID,
      processedUntil: 100,
    });

    const watermarks = await readWatermarks({
      state,
      spaceId: SPACE_ID,
      strategyIds: [STRATEGY_ID, 'never_ran'],
    });

    expect([...watermarks.keys()]).toEqual([STRATEGY_ID]);
  });
});
