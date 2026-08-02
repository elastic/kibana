/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WATCH_AUTONOMY_LEVELS } from '@kbn/pnd-common';
import { asWatchAutonomyLevel, DEFAULT_AUTONOMY_LEVEL, isWatchAutonomyLevel } from '.';

describe('DEFAULT_AUTONOMY_LEVEL', () => {
  it('is the most conservative level on the shared scale', () => {
    expect(DEFAULT_AUTONOMY_LEVEL).toBe('manual');
  });
});

describe('asWatchAutonomyLevel', () => {
  it.each([...WATCH_AUTONOMY_LEVELS])('returns the level %s unchanged', (level) => {
    expect(asWatchAutonomyLevel(level)).toBe(level);
  });

  it('falls back to manual for an unknown level name', () => {
    expect(asWatchAutonomyLevel('autonomous')).toBe('manual');
  });

  it('falls back to manual when nothing is persisted', () => {
    expect(asWatchAutonomyLevel(undefined)).toBe('manual');
  });

  it('falls back to manual for null', () => {
    expect(asWatchAutonomyLevel(null)).toBe('manual');
  });

  // The load-bearing case: a space seeded before the string conversion still holds an ordinal.
  // Clamping 3 to the highest level would hand it Supervised autonomy on stale state.
  it.each([1, 2, 3, 5])('fails closed for the legacy ordinal %p rather than clamping', (legacy) => {
    expect(asWatchAutonomyLevel(legacy)).toBe('manual');
  });

  it('falls back to manual for a level differing only in case', () => {
    expect(asWatchAutonomyLevel('Supervised')).toBe('manual');
  });
});

describe('isWatchAutonomyLevel', () => {
  it.each([...WATCH_AUTONOMY_LEVELS])('accepts the level %s', (level) => {
    expect(isWatchAutonomyLevel(level)).toBe(true);
  });

  it('rejects an unknown level name', () => {
    expect(isWatchAutonomyLevel('autonomous')).toBe(false);
  });

  it('rejects a legacy ordinal level', () => {
    expect(isWatchAutonomyLevel(3)).toBe(false);
  });
});
