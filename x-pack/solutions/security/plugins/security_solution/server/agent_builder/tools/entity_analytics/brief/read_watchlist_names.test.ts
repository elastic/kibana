/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWatchlistNames } from './read_watchlist_names';

describe('getWatchlistNames', () => {
  const namesById = new Map([['custom-id', 'Contractors']]);

  it.each([
    ['a prebuilt id', ['privileged-user-monitoring-watchlist-id'], ['Privileged User']],
    ['a custom id', ['custom-id'], ['Contractors']],
    ['an unknown id, which is a deleted watchlist and is dropped', ['gone-id'], []],
    ['each name once, in order', ['custom-id', 'gone-id', 'custom-id'], ['Contractors']],
  ])('resolves %s', (_description, ids, expected) => {
    expect(getWatchlistNames(ids, namesById)).toEqual(expected);
  });
});
