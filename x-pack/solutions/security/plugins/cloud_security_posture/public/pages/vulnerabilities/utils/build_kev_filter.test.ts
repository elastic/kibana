/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildKevFilter } from './build_kev_filter';

describe('buildKevFilter', () => {
  it('matches known_exploited: true instead of mere field existence', () => {
    const filter = buildKevFilter('data-view-id');

    expect(filter.query).toEqual({ match_phrase: { 'vulnerability.kev.known_exploited': true } });
    expect(filter.query).not.toHaveProperty('exists');
    expect(filter.meta).toMatchObject({
      key: 'vulnerability.kev.known_exploited',
      type: 'phrase',
      negate: false,
      index: 'data-view-id',
    });
  });
});
