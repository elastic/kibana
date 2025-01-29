/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mockSingleIndexResponse,
  mockSingleIndexStatsResponse,
} from '../../../__mocks__/fetch_indices.mock';

import { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';

import { mapIndexStats } from './map_index_stats';

describe('mapIndexStats util function', () => {
  it('maps index data and index status to api expected shape', () => {
    const mappedResult = mapIndexStats(
      mockSingleIndexResponse['search-regular-index'],
      mockSingleIndexStatsResponse.indices[
        'search-regular-index'
      ] as unknown as IndicesStatsIndicesStats,
      'search-regular-index'
    );

    expect(mappedResult).toEqual({
      aliases: [],
      health: 'green',
      hidden: false,
      name: 'search-regular-index',
      status: 'open',
      total: {
        docs: {
          count: 100,
          deleted: 0,
        },
        store: {
          size_in_bytes: '105.47kb',
        },
      },
      uuid: '83a81e7e-5955-4255-b008-5d6961203f57',
    });
  });
});
