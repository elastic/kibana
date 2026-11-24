/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPublishedBeforeLookback } from './publish_lookback';

const NOW = new Date('2026-05-16T12:00:00.000Z');
const DAY_MS = 86_400_000;

describe('isPublishedBeforeLookback', () => {
  it('keeps an entry with no date', () => {
    expect(isPublishedBeforeLookback(undefined, NOW)).toBe(false);
  });

  it('keeps an entry whose date does not parse', () => {
    expect(isPublishedBeforeLookback('not-a-date', NOW)).toBe(false);
  });

  it('keeps an entry published exactly 30 days ago', () => {
    const iso = new Date(NOW.getTime() - 30 * DAY_MS).toISOString();
    expect(isPublishedBeforeLookback(iso, NOW)).toBe(false);
  });

  it('drops an entry published 30 days and 1 ms ago', () => {
    const iso = new Date(NOW.getTime() - 30 * DAY_MS - 1).toISOString();
    expect(isPublishedBeforeLookback(iso, NOW)).toBe(true);
  });

  it('honours a custom lookback', () => {
    const iso = new Date(NOW.getTime() - 8 * DAY_MS).toISOString();
    expect(isPublishedBeforeLookback(iso, NOW, 7)).toBe(true);
    expect(isPublishedBeforeLookback(iso, NOW, 9)).toBe(false);
  });
});
