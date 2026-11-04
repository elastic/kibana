/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toMostCommonOrigin, toUrlFileName, toUrlOrigin } from './url_parts';

describe('url parts', () => {
  it('names a resource by its file, with its host when it is another origin', () => {
    expect(toUrlFileName('https://shop.example.com/static/app.js')).toBe('app.js');
    expect(toUrlFileName('https://cdn.net/lib/x.js', 'https://shop.example.com')).toBe(
      'cdn.net/…/x.js'
    );
    expect(toUrlFileName('https://shop.example.com/', 'https://shop.example.com')).toBe('/');
  });

  it('finds the origin of a URL and the one most URLs share', () => {
    expect(toUrlOrigin('https://shop.example.com/a')).toBe('https://shop.example.com');
    expect(toUrlOrigin('nope')).toBeUndefined();
    expect(
      toMostCommonOrigin(['https://a.com/1', 'https://b.com/1', 'https://b.com/2', 'nope'])
    ).toBe('https://b.com');
    expect(toMostCommonOrigin([])).toBeUndefined();
  });
});
