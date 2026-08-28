/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canonicalizeUrl } from './canonicalize_url';

describe('canonicalizeUrl', () => {
  it.each([
    ['http://example.com/path', 'https://example.com/path'],
    ['https://example.com/path', 'https://example.com/path'],
    ['https://www.example.com/page', 'https://example.com/page'],
    ['https://notwww.example.com/', 'https://notwww.example.com/'],
    ['https://www.com/path', 'https://www.com/path'],
    ['https://Blog.EXAMPLE.COM/post', 'https://blog.example.com/post'],
    ['https://www.EXAMPLE.com./post', 'https://example.com/post'],
    ['https://example.com/path/', 'https://example.com/path'],
    ['https://example.com/', 'https://example.com/'],
    ['https://example.com/post#section-2', 'https://example.com/post'],
    ['https://example.com/post?fbclid=abc123', 'https://example.com/post'],
    ['https://example.com/post?gclid=xyz', 'https://example.com/post'],
    ['https://example.com/post?ref=newsletter', 'https://example.com/post'],
    ['https://example.com/post?mc_cid=aaa&mc_eid=bbb', 'https://example.com/post'],
    [
      'https://example.com/post?utm_source=twitter&utm_medium=social&utm_campaign=q1',
      'https://example.com/post',
    ],
    ['https://example.com/search?q=malware&page=2', 'https://example.com/search?page=2&q=malware'],
    ['https://example.com/post?utm_source=tw&id=42', 'https://example.com/post?id=42'],
    ['https://example.com:8443/api', 'https://example.com:8443/api'],
    ['https://example.com:443/path', 'https://example.com/path'],
    ['http://example.com:443/path', 'https://example.com/path'],
    [
      'https://github.com/org/repo/tree/main?ref=main',
      'https://github.com/org/repo/tree/main?ref=main',
    ],
    ['https://docs.example.com/page?ref=v2.1', 'https://docs.example.com/page?ref=v2.1'],
    ['https://example.com/r?utility=1', 'https://example.com/r?utility=1'],
    ['https://example.com/p?Real=keepme', 'https://example.com/p?Real=keepme'],
  ])('canonicalizes %s', (input, expected) => {
    expect(canonicalizeUrl(input)).toBe(expected);
  });

  it.each(['ftp://example.com/file', 'data:text/plain,foo', 'not a url', ''])(
    'rejects %j',
    (input) => {
      expect(canonicalizeUrl(input)).toBeUndefined();
    }
  );

  it.each(['newsletter', 'email', 'twitter', 'rss', 'social'])(
    'strips the campaign ref value %s',
    (value) => {
      expect(canonicalizeUrl(`https://example.com/post?ref=${value}`)).toBe(
        'https://example.com/post'
      );
    }
  );

  it.each([
    'utm_source_platform',
    'utm_creative_format',
    'utm_marketing_tactic',
    'utm_something_new',
  ])('strips newer tracking field %s', (param) => {
    expect(canonicalizeUrl(`https://example.com/report?${param}=newsletter`)).toBe(
      'https://example.com/report'
    );
  });

  it.each(['FBCLID', 'fbclid', 'GCLID', 'MC_CID', 'UTM_source', 'utm_source', 'Ref'])(
    'matches tracking key %s case-insensitively',
    (key) => {
      expect(canonicalizeUrl(`https://example.com/p?${key}=twitter`)).toBe('https://example.com/p');
    }
  );

  it('sorts query parameters and collapses equivalent URL spellings', () => {
    expect(canonicalizeUrl('https://example.com/page?z=1&a=2')).toBe(
      canonicalizeUrl('https://example.com/page?a=2&z=1')
    );

    const variants = [
      'http://example.com/page',
      'https://example.com/page',
      'http://www.example.com/page',
      'https://www.example.com/page/',
      'https://www.example.com/page/?utm_source=rss',
      'http://www.example.com/page#anchor',
    ];
    expect(new Set(variants.map(canonicalizeUrl)).size).toBe(1);
  });
});
