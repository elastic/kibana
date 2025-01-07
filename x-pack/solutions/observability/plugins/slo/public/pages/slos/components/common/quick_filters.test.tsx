/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSelectedOptions } from './quick_filters';

describe('getSelectedOptions', () => {
  it('it works as expected ', () => {
    // @ts-expect-error
    expect(getSelectedOptions({})).toEqual([]);
    expect(getSelectedOptions()).toEqual([]);
    expect(
      getSelectedOptions({
        meta: {},
      })
    ).toEqual([]);
    expect(
      getSelectedOptions({
        meta: {
          params: ['tag'],
        },
      })
    ).toEqual(['tag']);

    expect(
      getSelectedOptions({
        meta: {},
        query: {
          match_phrase: {
            'slo.tags': 'tag',
          },
        },
      })
    ).toEqual(['tag']);

    expect(
      getSelectedOptions({
        meta: {},
        query: {
          match_phrase: {
            status: 'violated',
          },
        },
      })
    ).toEqual(['violated']);
  });
});
