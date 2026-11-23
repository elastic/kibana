/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { feedMirrorUrlProblem, MAX_FEED_MIRROR_URL_LENGTH, resolveFeedUrl } from './mirror';

describe('resolveFeedUrl', () => {
  const url = 'https://security.access.redhat.com/data/oval/v2/RHEL9/rhel-9.oval.xml.bz2';

  it('returns the vendor URL untouched without a mirror', () => {
    expect(resolveFeedUrl(url)).toBe(url);
    expect(resolveFeedUrl(url, undefined)).toBe(url);
    expect(resolveFeedUrl(url, '')).toBe(url);
  });

  it('lays the file out as <mirror>/<host>/<path>, like wget --force-directories', () => {
    expect(resolveFeedUrl(url, 'https://mirror.corp.example/feeds')).toBe(
      'https://mirror.corp.example/feeds/security.access.redhat.com/data/oval/v2/RHEL9/rhel-9.oval.xml.bz2'
    );
  });

  it.each(['https://m.example', 'https://m.example/', 'https://m.example///'])(
    'handles a trailing slash on the base %s',
    (mirror) => {
      expect(resolveFeedUrl(url, mirror)).toBe(
        'https://m.example/security.access.redhat.com/data/oval/v2/RHEL9/rhel-9.oval.xml.bz2'
      );
    }
  );

  it('keeps a port in the mirror and the query string of the vendor URL', () => {
    expect(resolveFeedUrl('https://cdn.example/a/b.json?x=1&y=2', 'http://10.0.0.5:8080/m')).toBe(
      'http://10.0.0.5:8080/m/cdn.example/a/b.json?x=1&y=2'
    );
  });
});

describe('feedMirrorUrlProblem', () => {
  it('accepts plain http(s) bases', () => {
    expect(feedMirrorUrlProblem('https://mirror.corp.example/feeds/')).toBeUndefined();
    expect(feedMirrorUrlProblem('http://10.0.0.5:8080')).toBeUndefined();
  });

  it.each([
    ['https://user:pw@mirror.example/', 'credentials'],
    ['https://mirror.example/?a=1', 'query string'],
    ['https://mirror.example/#frag', 'query string'],
    ['https://m.example/?', 'query string'],
    ['https://m.example/#', 'query string'],
    [`https://mirror.example/${'a'.repeat(MAX_FEED_MIRROR_URL_LENGTH)}`, 'at most'],
  ])('rejects %#', (value, reason) => {
    expect(feedMirrorUrlProblem(value)).toContain(reason);
  });
});
