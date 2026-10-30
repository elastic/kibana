/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { domainsToLines, parseDomainUrls } from './create_web_crawler_flyout';

describe('parseDomainUrls', () => {
  it('groups URLs by domain and keeps paths as seed urls', () => {
    const { domains, invalid } = parseDomainUrls(
      'https://www.example.com\nhttps://www.example.com/blog\n\nhttps://docs.example.com/start?x=1\n'
    );
    expect(invalid).toEqual([]);
    expect(domains).toEqual([
      { url: 'https://www.example.com', seed_urls: ['https://www.example.com/blog'] },
      { url: 'https://docs.example.com', seed_urls: ['https://docs.example.com/start?x=1'] },
    ]);
  });

  it('round-trips domains through the textarea representation', () => {
    const domains = [
      { url: 'https://www.example.com', seed_urls: ['https://www.example.com/blog'] },
      { url: 'https://docs.example.com' },
    ];
    expect(domainsToLines(domains)).toBe('https://www.example.com/blog\nhttps://docs.example.com');
    expect(parseDomainUrls(domainsToLines(domains)).domains).toEqual(domains);
  });

  it('reports invalid and non-http URLs', () => {
    const { domains, invalid } = parseDomainUrls(
      'ftp://example.com\nnot a url\nhttp://ok.example.com'
    );
    expect(invalid).toEqual(['ftp://example.com', 'not a url']);
    expect(domains).toEqual([{ url: 'http://ok.example.com' }]);
  });
});
