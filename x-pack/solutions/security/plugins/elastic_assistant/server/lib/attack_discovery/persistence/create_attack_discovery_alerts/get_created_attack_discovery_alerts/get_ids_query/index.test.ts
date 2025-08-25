/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIdsQuery } from '.';

describe('getIdsQuery', () => {
  it('returns the expected query for an empty array', () => {
    const result = getIdsQuery([]);

    expect(result).toEqual({
      query: {
        ids: {
          values: [],
        },
      },
    });
  });

  it('returns the expected query for a single document ID', () => {
    const result = getIdsQuery(['testId']);

    expect(result).toEqual({
      query: {
        ids: {
          values: ['testId'],
        },
      },
    });
  });

  it('returns the expected query for multiple document IDs', () => {
    const ids = ['id1', 'id2', 'id3'];
    const result = getIdsQuery(ids);

    expect(result).toEqual({
      query: {
        ids: {
          values: ids,
        },
      },
    });
  });
});
