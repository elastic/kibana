/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTickTimeRange } from './signals_in_discover';

describe('getTickTimeRange', () => {
  it('floors the start and the end to the minute they fall in', () => {
    expect(getTickTimeRange({ startedAt: '2026-11-26T10:00:20.000Z', durationMs: 90_000 })).toEqual(
      { from: '2026-11-26T10:00:00.000Z', to: '2026-11-26T10:01:00.000Z' }
    );
  });

  it('stays on one minute for a quick tick, without reaching into the next', () => {
    expect(getTickTimeRange({ startedAt: '2026-11-26T10:00:05.000Z', durationMs: 30_000 })).toEqual(
      { from: '2026-11-26T10:00:00.000Z', to: '2026-11-26T10:00:00.000Z' }
    );
  });
});
