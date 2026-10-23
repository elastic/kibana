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
      esTaskId: 'node:123',
      done: false,
      failures: 1,
      conflictReissues: 1,
      stamped: 42,
      unstampedAtStart: 1_000,
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
      esTaskId: undefined,
      done: true,
      failures: 0,
      conflictReissues: 0,
      stamped: 0,
      unstampedAtStart: undefined,
    });
  });

  it('leaves an unusable starting backlog unset rather than counting it as zero', () => {
    const { spaces } = migrate({ spaces: { default: { done: true, unstampedAtStart: 'lots' } } });

    expect(spaces.default.unstampedAtStart).toBeUndefined();
  });

  it('drops an Elasticsearch task id that is not a string', () => {
    // Polling a malformed id fails the space on every run. Dropping it reissues the request, which
    // only costs repeating whatever the previous one had not reached.
    const { spaces } = migrate({
      spaces: { default: { done: false, esTaskId: { id: 'node:123' } } },
    });

    expect(spaces.default.esTaskId).toBeUndefined();
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
