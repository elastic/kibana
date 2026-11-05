/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toUrlFileName } from './url_parts';

describe('url parts', () => {
  it('names a resource by its file, with its host when it is another origin', () => {
    expect(toUrlFileName('https://shop.example.com/static/app.js')).toBe('app.js');
    expect(toUrlFileName('https://cdn.net/lib/x.js', 'https://shop.example.com')).toBe(
      'cdn.net/…/x.js'
    );
    expect(toUrlFileName('https://shop.example.com/', 'https://shop.example.com')).toBe('/');
    expect(toUrlFileName('https://shop.example.com/v3/', 'https://shop.example.com')).toBe('/v3/');
    expect(toUrlFileName('https://js.pay.com/v3/', 'https://shop.example.com')).toBe(
      'js.pay.com/v3/'
    );
  });
});
