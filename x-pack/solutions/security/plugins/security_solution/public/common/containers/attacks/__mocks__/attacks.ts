/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchAttacksResponse } from '../../../../../common/api/detection_engine/attacks';

export const getSearchAttacksResponseMock = (
  overrides?: Partial<SearchAttacksResponse>
): SearchAttacksResponse => ({
  took: 5,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 2,
      relation: 'eq' as const,
    },
    max_score: 1.0,
    hits: [
      {
        _index: '.alerts-security.attack-default',
        _id: 'attack-1',
        _score: 1.0,
        _source: {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          'kibana.alert.rule.name': 'Attack Discovery 1',
        },
      },
      {
        _index: '.alerts-security.attack-default',
        _id: 'attack-2',
        _score: 1.0,
        _source: {
          '@timestamp': '2024-01-01T01:00:00.000Z',
          'kibana.alert.rule.name': 'Attack Discovery 2',
        },
      },
    ],
  },
  ...overrides,
});
