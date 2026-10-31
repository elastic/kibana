/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kueryFilters } from './kuery';

describe('kueryFilters', () => {
  it('returns nothing for empty input', () => {
    expect(kueryFilters(undefined)).toEqual([]);
    expect(kueryFilters('  ')).toEqual([]);
  });

  it('converts KQL to an ES query', () => {
    expect(kueryFilters('resource.attributes.user.name: Hopper')).toEqual([
      {
        bool: {
          should: [{ match: { 'resource.attributes.user.name': 'Hopper' } }],
          minimum_should_match: 1,
        },
      },
    ]);
  });

  it('matches nothing when KQL is invalid', () => {
    expect(kueryFilters('user.name:')).toEqual([{ match_none: {} }]);
  });
});
