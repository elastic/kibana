/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extraPathsForFind,
  hasStructuredFind,
  intersectSessionIds,
  isEmailLike,
  mergeSessionFind,
  pagePathFilter,
  parseSessionFind,
  sessionFindClauses,
  sessionIdTermsFilter,
  sessionIndexFindFilters,
  wildcardContains,
} from './session_find';

describe('parseSessionFind', () => {
  it('parses prefixed tokens', () => {
    expect(parseSessionFind('path:/checkout click:#buy error:TypeError user:ada')).toEqual({
      path: '/checkout',
      click: '#buy',
      error: 'TypeError',
      user: 'ada',
    });
  });

  it('accepts quoted values', () => {
    expect(parseSessionFind('click:"button.checkout" account:"acme"')).toEqual({
      click: 'button.checkout',
      account: 'acme',
    });
  });

  it('treats a bare path or selector as structured', () => {
    expect(parseSessionFind('/checkout')).toEqual({ path: '/checkout' });
    expect(parseSessionFind('#buy')).toEqual({ click: '#buy' });
    expect(parseSessionFind('.btn-primary')).toEqual({ click: '.btn-primary' });
  });

  it('treats a bare email as a user filter', () => {
    expect(parseSessionFind('ada@elastic.co')).toEqual({ user: 'ada@elastic.co' });
    expect(isEmailLike('ada@elastic.co')).toBe(true);
    expect(isEmailLike('not-an-email')).toBe(false);
  });

  it('keeps unprefixed text for the haystack search', () => {
    expect(parseSessionFind('ada')).toEqual({ text: 'ada' });
  });
});

describe('mergeSessionFind', () => {
  it('fills gaps from URL params without overriding typed prefixes', () => {
    expect(
      mergeSessionFind(parseSessionFind('click:#buy'), { path: '/cart', user: 'ada' })
    ).toEqual({
      path: '/cart',
      click: '#buy',
      user: 'ada',
    });
    expect(mergeSessionFind(parseSessionFind('path:/a'), { path: '/b' }).path).toBe('/a');
  });
});

describe('sessionFindClauses', () => {
  it('puts click + account on one document', () => {
    const clauses = sessionFindClauses({ click: '#buy', account: 'acme' });
    expect(clauses).toHaveLength(1);
    expect(JSON.stringify(clauses[0])).toContain('browser.user_action.click');
    expect(JSON.stringify(clauses[0])).toContain('user.account');
  });

  it('puts error + path on one document and intersects an extra page chip', () => {
    const clauses = sessionFindClauses({ error: 'TypeError', path: '/checkout' }, ['/other']);
    expect(clauses).toHaveLength(2);
    expect(JSON.stringify(clauses[0])).toContain('exception');
    expect(JSON.stringify(clauses[1])).toContain('/other');
  });

  it('intersects path and click when they are separate events', () => {
    const clauses = sessionFindClauses({ path: '/checkout', click: '#buy' });
    expect(clauses).toHaveLength(2);
  });
});

describe('pagePathFilter', () => {
  it('uses wildcard contains for a plain path', () => {
    expect(JSON.stringify(pagePathFilter('/cart'))).toContain('*/cart*');
  });

  it('treats a leading ^ as a prefix regexp', () => {
    const encoded = JSON.stringify(pagePathFilter('^/checkout'));
    expect(encoded).toContain('regexp');
    expect(encoded).toContain('/checkout.*');
  });
});

describe('helpers', () => {
  it('intersects session id sets', () => {
    expect(
      intersectSessionIds([
        ['a', 'b', 'c'],
        ['b', 'c', 'd'],
      ])
    ).toEqual(['b', 'c']);
  });

  it('builds a terms filter across session id fields', () => {
    expect(JSON.stringify(sessionIdTermsFilter(['s1']))).toContain('attributes.session.id');
  });

  it('skips extra path when it matches the typed path', () => {
    expect(extraPathsForFind({ path: '/a' }, '/a')).toEqual([]);
    expect(extraPathsForFind({ path: '/a' }, '/b')).toEqual(['/b']);
  });

  it('flags structured finds', () => {
    expect(hasStructuredFind({ text: 'ada' })).toBe(false);
    expect(hasStructuredFind({ click: '#buy' })).toBe(true);
  });

  it('escapes wildcard metacharacters', () => {
    expect(JSON.stringify(wildcardContains(['f'], 'a*b'))).toContain('a\\\\*b');
  });
});

describe('sessionIndexFindFilters', () => {
  it('maps user and email onto user.key', () => {
    const encoded = JSON.stringify(sessionIndexFindFilters({ user: 'ada@elastic.co' }));
    expect(encoded).toContain('user.key');
    expect(encoded).toContain('*ada@elastic.co*');
    expect(encoded).toContain('case_insensitive');
  });

  it('maps path, click, error, and leftover text onto session fields', () => {
    const filters = sessionIndexFindFilters(
      { path: '/checkout', click: '#buy', error: 'TypeError', text: 'sess-1' },
      ['/other']
    );
    const encoded = JSON.stringify(filters);
    expect(encoded).toContain('pages');
    expect(encoded).toContain('clicks');
    expect(encoded).toContain('error_count');
    expect(encoded).toContain('session.id');
    expect(encoded).toContain('/other');
  });
});
