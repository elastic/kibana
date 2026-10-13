/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stateSchemaByVersion } from './state';

const { up, schema: stateSchema } = stateSchemaByVersion[1];

/**
 * Task Manager runs `up` and then validates its output. If validation throws, the task fails and
 * keeps failing, because the state it chokes on is never replaced — so every case here asserts
 * the migrated state is something the schema accepts.
 */
const migrate = (state: Record<string, unknown>) => {
  const migrated = up(state);
  expect(() => stateSchema.validate(migrated)).not.toThrow();
  return migrated;
};

describe('backfill task state, version 1', () => {
  it('accepts empty state', () => {
    expect(migrate({})).toEqual({ spaces: {}, runs: 0 });
  });

  it('keeps a well-formed space entry intact', () => {
    const progress = {
      window: { start: '2026-09-08T00:00:00.000Z', end: '2026-10-08T00:00:00.000Z' },
      searchAfter: ['2026-09-15T00:00:00.000Z', 'alert-9'],
      done: false,
      failures: 1,
      stamped: 42,
      skipped: 3,
    };

    expect(migrate({ spaces: { default: progress }, runs: 7 })).toEqual({
      spaces: { default: progress },
      runs: 7,
    });
  });

  it('fills in fields missing from a space entry', () => {
    // The shape a version written before a field existed would have.
    const { spaces } = migrate({ spaces: { default: { done: true } } });

    expect(spaces.default).toEqual({
      window: undefined,
      searchAfter: undefined,
      done: true,
      failures: 0,
      stamped: 0,
      skipped: 0,
    });
  });

  it('drops a cursor that is not entirely sort values', () => {
    // Resuming from a partly-valid cursor would restart mid-window at the wrong place. Dropping it
    // restarts that space's pass from the beginning, which only costs repeated work.
    const { spaces } = migrate({
      spaces: {
        default: { done: false, searchAfter: ['2026-09-15T00:00:00.000Z', { bad: true }] },
      },
    });

    expect(spaces.default.searchAfter).toBeUndefined();
  });

  it('drops a half-written window', () => {
    const { spaces } = migrate({
      spaces: { default: { done: false, window: { start: '2026-09-08T00:00:00.000Z' } } },
    });

    expect(spaces.default.window).toBeUndefined();
  });

  it('replaces a space entry that is not an object', () => {
    const { spaces } = migrate({ spaces: { default: 'corrupted' } });

    expect(spaces.default).toMatchObject({ done: false, failures: 0 });
  });

  it('replaces spaces and runs when they are the wrong type', () => {
    expect(migrate({ spaces: [], runs: 'many' })).toEqual({ spaces: {}, runs: 0 });
  });
});
