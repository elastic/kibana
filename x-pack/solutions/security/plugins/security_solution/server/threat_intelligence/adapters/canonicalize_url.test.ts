/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canonicalizeUrl } from './canonicalize_url';

describe('canonicalizeUrl', () => {
  // --- Scheme normalization -----------------------------------------------

  it('maps http to https in the key', () => {
    expect(canonicalizeUrl('http://example.com/path')).toBe('https://example.com/path');
  });

  it('preserves https unchanged', () => {
    expect(canonicalizeUrl('https://example.com/path')).toBe('https://example.com/path');
  });

  it('returns undefined for non-http(s) schemes', () => {
    expect(canonicalizeUrl('ftp://example.com/file')).toBeUndefined();
    expect(canonicalizeUrl('data:text/plain,foo')).toBeUndefined();
  });

  // --- www stripping -------------------------------------------------------

  it('strips a leading www. from the host', () => {
    expect(canonicalizeUrl('https://www.example.com/page')).toBe('https://example.com/page');
  });

  it('does not strip www that is not a leading label', () => {
    expect(canonicalizeUrl('https://notwww.example.com/')).toBe('https://notwww.example.com/');
  });

  // --- Host case-folding --------------------------------------------------

  it('lowercases the host', () => {
    expect(canonicalizeUrl('https://Blog.EXAMPLE.COM/post')).toBe('https://blog.example.com/post');
  });

  // --- Trailing slash removal ---------------------------------------------

  it('removes a trailing slash from the path', () => {
    expect(canonicalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
  });

  it('does not remove the root slash on bare-origin URLs', () => {
    // Bare root: path is just "/" — kept as-is to avoid producing an empty key
    const result = canonicalizeUrl('https://example.com/');
    expect(result).toBe('https://example.com/');
  });

  // --- Fragment dropping --------------------------------------------------

  it('drops the fragment', () => {
    expect(canonicalizeUrl('https://example.com/post#section-2')).toBe('https://example.com/post');
  });

  // --- Tracking-param removal ---------------------------------------------

  it('strips utm_* params', () => {
    expect(
      canonicalizeUrl(
        'https://example.com/post?utm_source=twitter&utm_medium=social&utm_campaign=q1'
      )
    ).toBe('https://example.com/post');
  });

  it('strips fbclid', () => {
    expect(canonicalizeUrl('https://example.com/post?fbclid=abc123')).toBe(
      'https://example.com/post'
    );
  });

  it('strips gclid', () => {
    expect(canonicalizeUrl('https://example.com/post?gclid=xyz')).toBe('https://example.com/post');
  });

  it('strips ref', () => {
    expect(canonicalizeUrl('https://example.com/post?ref=newsletter')).toBe(
      'https://example.com/post'
    );
  });

  it('strips mc_cid and mc_eid', () => {
    expect(canonicalizeUrl('https://example.com/post?mc_cid=aaa&mc_eid=bbb')).toBe(
      'https://example.com/post'
    );
  });

  it('preserves non-tracking query params', () => {
    expect(canonicalizeUrl('https://example.com/search?q=malware&page=2')).toBe(
      'https://example.com/search?page=2&q=malware'
    );
  });

  it('removes tracking params but keeps non-tracking ones', () => {
    expect(canonicalizeUrl('https://example.com/post?utm_source=tw&id=42')).toBe(
      'https://example.com/post?id=42'
    );
  });

  // --- Query param sorting (stability) ------------------------------------

  it('sorts remaining query params for key stability', () => {
    const a = canonicalizeUrl('https://example.com/page?z=1&a=2');
    const b = canonicalizeUrl('https://example.com/page?a=2&z=1');
    expect(a).toBe(b);
    expect(a).toBe('https://example.com/page?a=2&z=1');
  });

  // --- Explicit port -------------------------------------------------------

  it('preserves an explicit non-default port', () => {
    expect(canonicalizeUrl('https://example.com:8443/api')).toBe('https://example.com:8443/api');
  });

  it('does not include the default 443 port in the key', () => {
    // URL parser strips the default port so this should produce no port token
    expect(canonicalizeUrl('https://example.com:443/path')).toBe('https://example.com/path');
  });

  // --- Malformed input ----------------------------------------------------

  it('returns undefined for a non-URL string', () => {
    expect(canonicalizeUrl('not a url')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(canonicalizeUrl('')).toBeUndefined();
  });

  // --- The key invariant: two differently-written equivalent URLs → same key ---

  it('two equivalent URLs with different tracking params canonicalize to the same key', () => {
    const a = canonicalizeUrl(
      'http://www.blog.example.com/post/?utm_source=twitter&utm_campaign=2024#comments'
    );
    const b = canonicalizeUrl('https://blog.example.com/post');
    expect(a).toBe(b);
    expect(a).toBeDefined();
  });

  it('http and https with www and trailing slash all collapse to one key', () => {
    const variants = [
      'http://example.com/page',
      'https://example.com/page',
      'http://www.example.com/page',
      'https://www.example.com/page/',
      'https://www.example.com/page/?utm_source=rss',
      'http://www.example.com/page#anchor',
    ];
    const keys = variants.map(canonicalizeUrl);
    const unique = new Set(keys);
    expect(unique.size).toBe(1);
  });
});
