/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveWatchlistByName } from './resolve_watchlist';

const WATCHLISTS = [
  { id: 'wl-priv', name: 'Privileged Users' },
  { id: 'wl-comp', name: 'Compromised Accounts' },
  { id: 'wl-priv-2', name: 'Privileged Service Accounts' },
];

describe('resolveWatchlistByName', () => {
  it('resolves an exact name case-insensitively', () => {
    expect(resolveWatchlistByName('privileged users', WATCHLISTS)).toEqual({ id: 'wl-priv' });
  });

  it('trims surrounding whitespace', () => {
    expect(resolveWatchlistByName('  Compromised Accounts  ', WATCHLISTS)).toEqual({
      id: 'wl-comp',
    });
  });

  it('resolves a unique substring match', () => {
    expect(resolveWatchlistByName('Compromised', WATCHLISTS)).toEqual({ id: 'wl-comp' });
  });

  it('prefers an exact name over substring matches', () => {
    // "Privileged Users" exact-matches wl-priv, even though "Privileged" is a substring of two.
    expect(resolveWatchlistByName('Privileged Users', WATCHLISTS)).toEqual({ id: 'wl-priv' });
  });

  it('errors (ambiguous) when a substring matches multiple names', () => {
    expect(resolveWatchlistByName('Privileged', WATCHLISTS)).toEqual({
      error: expect.stringContaining('matches multiple watchlists'),
    });
  });

  it('errors when nothing matches', () => {
    expect(resolveWatchlistByName('Nonexistent', WATCHLISTS)).toEqual({
      error: expect.stringContaining('No watchlist found'),
    });
  });

  it('errors (ambiguous) when two watchlists share the same name', () => {
    const dupes = [
      { id: 'a', name: 'Dupe' },
      { id: 'b', name: 'Dupe' },
    ];
    expect(resolveWatchlistByName('Dupe', dupes)).toEqual({
      error: expect.stringContaining('Multiple watchlists are named'),
    });
  });
});
