/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatRelativeUpdatedAt } from '.';

const NOW = Date.parse('2026-08-27T18:00:00.000Z');

const isoMinutesAgo = (minutes: number): string =>
  new Date(NOW - minutes * 60 * 1000).toISOString();

describe('formatRelativeUpdatedAt', () => {
  it('returns now when the conversation was updated less than a minute ago', () => {
    expect(
      formatRelativeUpdatedAt({
        now: NOW,
        updatedAt: new Date(NOW - 15 * 1000).toISOString(),
      })
    ).toEqual('now');
  });

  it('returns a compact minute label', () => {
    expect(formatRelativeUpdatedAt({ now: NOW, updatedAt: isoMinutesAgo(1) })).toEqual('1m');
  });

  it('floors minutes rather than rounding up', () => {
    expect(formatRelativeUpdatedAt({ now: NOW, updatedAt: isoMinutesAgo(59) })).toEqual('59m');
  });

  it('returns a compact hour label', () => {
    expect(formatRelativeUpdatedAt({ now: NOW, updatedAt: isoMinutesAgo(60) })).toEqual('1h');
  });

  it('floors hours rather than rounding up', () => {
    expect(formatRelativeUpdatedAt({ now: NOW, updatedAt: isoMinutesAgo(23 * 60 + 59) })).toEqual(
      '23h'
    );
  });

  it('returns a compact day label', () => {
    expect(formatRelativeUpdatedAt({ now: NOW, updatedAt: isoMinutesAgo(24 * 60) })).toEqual('1d');
  });

  it('keeps counting in days past a week', () => {
    expect(formatRelativeUpdatedAt({ now: NOW, updatedAt: isoMinutesAgo(10 * 24 * 60) })).toEqual(
      '10d'
    );
  });

  it('treats a future timestamp as now rather than a negative duration', () => {
    expect(
      formatRelativeUpdatedAt({
        now: NOW,
        updatedAt: new Date(NOW + 60 * 1000).toISOString(),
      })
    ).toEqual('now');
  });

  it('returns undefined when the timestamp is not a date', () => {
    expect(formatRelativeUpdatedAt({ now: NOW, updatedAt: 'not a date' })).toBeUndefined();
  });
});
