/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { patchUrlQuery } from './use_update_url_query';

describe('patchUrlQuery', () => {
  it('sets and removes params, keeping the others, sorted like router links', () => {
    expect(
      patchUrlQuery('?rangeTo=now&os=Linux&browser=Chrome', {
        search: 'checkout',
        os: undefined,
        browser: '',
      })
    ).toBe('rangeTo=now&search=checkout');
  });

  it('removes the listed params too', () => {
    expect(patchUrlQuery('?page=3&os=Linux', { browser: 'Firefox' }, ['page'])).toBe(
      'browser=Firefox&os=Linux'
    );
  });
});
