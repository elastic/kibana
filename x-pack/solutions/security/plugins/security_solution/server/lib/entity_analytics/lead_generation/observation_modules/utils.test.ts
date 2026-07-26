/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LeadEntity } from '../types';
import {
  errorMessage,
  extractIsPrivileged,
  matchesPrivilegedWatchlist,
  PRIVILEGED_USER_WATCHLIST_ID,
} from './utils';

const buildEntity = (overrides: Partial<LeadEntity> = {}): LeadEntity => ({
  record: {} as unknown as LeadEntity['record'],
  id: 'user:alice',
  type: 'user',
  name: 'Alice Adams',
  ...overrides,
});

describe('matchesPrivilegedWatchlist', () => {
  it('returns true when any entry starts with the privileged-user watchlist prefix', () => {
    expect(matchesPrivilegedWatchlist([`${PRIVILEGED_USER_WATCHLIST_ID}-default`])).toBe(true);
  });

  it('returns false when no entry matches the prefix', () => {
    expect(matchesPrivilegedWatchlist(['some-other-watchlist'])).toBe(false);
  });

  it('returns false when the input is not an array', () => {
    expect(matchesPrivilegedWatchlist(undefined)).toBe(false);
    expect(matchesPrivilegedWatchlist('a-string')).toBe(false);
    expect(matchesPrivilegedWatchlist(null)).toBe(false);
  });

  it('ignores non-string array entries', () => {
    expect(matchesPrivilegedWatchlist([42, { foo: 'bar' }])).toBe(false);
  });
});

describe('extractIsPrivileged', () => {
  const withWatchlists = (watchlists: unknown): LeadEntity =>
    buildEntity({
      record: { entity: { attributes: { watchlists } } } as unknown as LeadEntity['record'],
    });

  it('returns true when a watchlist matches the privileged prefix', () => {
    expect(extractIsPrivileged(withWatchlists([`${PRIVILEGED_USER_WATCHLIST_ID}-default`]))).toBe(
      true
    );
  });

  it('returns false when no watchlist entry matches', () => {
    expect(extractIsPrivileged(withWatchlists(['some-other-watchlist']))).toBe(false);
  });

  it('returns false when watchlists is not an array', () => {
    expect(extractIsPrivileged(withWatchlists(undefined))).toBe(false);
    expect(extractIsPrivileged(withWatchlists('a-string'))).toBe(false);
  });
});

describe('errorMessage', () => {
  it('returns the message of a real Error instance without the "Error:" prefix', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });

  it('falls back to String() for non-Error throwables so plain objects do not render as [object Object]', () => {
    expect(errorMessage('plain string')).toBe('plain string');
    expect(errorMessage(42)).toBe('42');
    expect(errorMessage(undefined)).toBe('undefined');
  });
});
