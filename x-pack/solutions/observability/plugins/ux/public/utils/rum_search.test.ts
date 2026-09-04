/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mergeRumSearch,
  parseReplayOffsetMs,
  pushRumPath,
  serviceNameFromSearch,
  sessionsPatch,
  uxAppHref,
  uxQueryString,
} from './rum_search';

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

  it('stores custom bot keywords', () => {
    expect(mergeRumSearch('?rangeFrom=now-24h', { botUa: 'bot,synthetics' })).toBe(
      'rangeFrom=now-24h&botUa=bot%2Csynthetics'
    );
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

  it('stores inventory platform and environment facets', () => {
    expect(mergeRumSearch('?rangeFrom=now-24h', { platform: 'android', environment: 'prod' })).toBe(
      'rangeFrom=now-24h&platform=android&environment=prod'
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
      hasReplay: '',
      hasBounced: '',
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
      hasReplay: '',
      hasBounced: '',
    });
  });

  it('can set the replay filter after clearing exclusive keys', () => {
    expect(sessionsPatch({ errorGroup: 'TypeError|x', hasReplay: 'true' })).toEqual({
      frustration: '',
      pageUrl: '',
      errorGroup: 'TypeError|x',
      sessionIds: '',
      user: '',
      click: '',
      account: '',
      sessionQuery: '',
      location: '',
      hasReplay: 'true',
      hasBounced: '',
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

describe('serviceNameFromSearch', () => {
  it('reads a trimmed service name', () => {
    expect(serviceNameFromSearch('?serviceName=shop&rangeFrom=now-24h')).toBe('shop');
  });

  it('returns undefined when missing or blank', () => {
    expect(serviceNameFromSearch('?rangeFrom=now-24h')).toBeUndefined();
    expect(serviceNameFromSearch('?serviceName=%20')).toBeUndefined();
  });
});

describe('uxQueryString', () => {
  it('prefixes a question mark and can drop serviceName', () => {
    expect(uxQueryString('?rangeFrom=now-24h&serviceName=shop', { serviceName: '' })).toBe(
      '?rangeFrom=now-24h'
    );
  });
});

describe('uxAppHref', () => {
  const prepend = (path: string) => `/session-replay${path}`;

  it('builds the inventory href without a serviceName query', () => {
    expect(uxAppHref(prepend, { search: '?rangeFrom=now-24h&serviceName=shop' })).toBe(
      '/session-replay/app/ux?rangeFrom=now-24h'
    );
  });

  it('puts the app name in the path', () => {
    expect(
      uxAppHref(prepend, {
        serviceName: 'weather-demo-app',
        suffix: '/pages',
        search: '?rangeFrom=now-24h',
      })
    ).toBe('/session-replay/app/ux/weather-demo-app/pages?rangeFrom=now-24h');
  });
});

describe('pushRumPath', () => {
  it('puts serviceName in the path and strips it from search', () => {
    const pushed: Array<{ pathname: string; search: string }> = [];
    const history = {
      location: { pathname: '/', search: '?rangeFrom=now-24h' },
      push: (next: { pathname: string; search: string }) => {
        pushed.push(next);
      },
    };
    pushRumPath(history as never, '/', { serviceName: 'weather-demo-app' });
    expect(pushed).toEqual([{ pathname: '/weather-demo-app', search: 'rangeFrom=now-24h' }]);
  });

  it('keeps the current app when navigating to a tab', () => {
    const pushed: Array<{ pathname: string; search: string }> = [];
    const history = {
      location: { pathname: '/weather-demo-app', search: '?rangeFrom=now-24h' },
      push: (next: { pathname: string; search: string }) => {
        pushed.push(next);
      },
    };
    pushRumPath(history as never, '/pages', { pageUrl: 'home' });
    expect(pushed).toEqual([
      { pathname: '/weather-demo-app/pages', search: 'rangeFrom=now-24h&pageUrl=home' },
    ]);
  });
});
