/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeRumSearch, parseReplayOffsetMs, sessionsPatch } from './rum_search';

describe('mergeRumSearch', () => {
  it('adds and removes filter params while keeping the rest', () => {
    expect(
      mergeRumSearch('?rangeFrom=now-24h&pageUrl=/cart', { frustration: 'rage', pageUrl: '' })
    ).toBe('rangeFrom=now-24h&frustration=rage');
  });

  it('stores kuery in the search string', () => {
    expect(mergeRumSearch('?rangeFrom=now-24h', { kuery: 'user.name: Ada' })).toBe(
      'rangeFrom=now-24h&kuery=user.name:%20Ada'
    );
  });

  it('stores user and includeBots', () => {
    expect(
      mergeRumSearch('?rangeFrom=now-24h', { user: 'ada@elastic.co', includeBots: 'true' })
    ).toBe('rangeFrom=now-24h&user=ada%40elastic.co&includeBots=true');
  });

  it('stores replay offset t', () => {
    expect(mergeRumSearch('?rangeFrom=now-24h', { t: '1500' })).toBe('rangeFrom=now-24h&t=1500');
  });

  it('stores a conversion goal id', () => {
    expect(mergeRumSearch('?rangeFrom=now-24h', { goalId: 'goal-1' })).toBe(
      'rangeFrom=now-24h&goalId=goal-1'
    );
  });

  it('stores session analytics flags', () => {
    expect(mergeRumSearch('?rangeFrom=now-24h', { includeRaw: 'true', analyticsMode: 'raw' })).toBe(
      'rangeFrom=now-24h&includeRaw=true&analyticsMode=raw'
    );
  });

  it('stores session find params', () => {
    expect(
      mergeRumSearch('?rangeFrom=now-24h', {
        sessionQuery: 'click:#buy',
        click: '#buy',
        account: 'acme',
      })
    ).toBe('rangeFrom=now-24h&sessionQuery=click:%23buy&click=%23buy&account=acme');
  });
});

describe('sessionsPatch', () => {
  it('clears exclusive session filters then applies the patch', () => {
    expect(sessionsPatch({ frustration: 'error' })).toEqual({
      frustration: 'error',
      pageUrl: '',
      errorGroup: '',
      sessionIds: '',
      user: '',
      click: '',
      account: '',
      sessionQuery: '',
      location: '',
    });
  });

  it('keeps includeBots out of the exclusive clear set', () => {
    expect(sessionsPatch({ user: 'ada' })).toEqual({
      frustration: '',
      pageUrl: '',
      errorGroup: '',
      sessionIds: '',
      user: 'ada',
      click: '',
      account: '',
      sessionQuery: '',
      location: '',
    });
  });
});

describe('parseReplayOffsetMs', () => {
  it('reads a non-negative integer from t', () => {
    expect(parseReplayOffsetMs('?rangeFrom=now-24h&t=1500')).toBe(1500);
    expect(parseReplayOffsetMs('?t=0')).toBe(0);
  });

  it('returns null when t is missing or invalid', () => {
    expect(parseReplayOffsetMs('?rangeFrom=now-24h')).toBeNull();
    expect(parseReplayOffsetMs('?t=nope')).toBeNull();
    expect(parseReplayOffsetMs('?t=-12')).toBeNull();
  });
});
