/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivMonBulkUser } from './types';

export const createMockUsers = (
  entries: Array<{ username: string; id?: string }>,
  indexName = 'privilege_monitoring_users'
): PrivMonBulkUser[] => {
  return entries.map(({ username, id }) => ({
    username,
    existingUserId: id,
    indexName,
  }));
};

export function createEsSearchResponse<T>(
  hits: Array<{ _id: string; _index: string; _source: T }>
) {
  return {
    took: 1,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: hits.length,
      max_score: 1.0,
      hits: hits.map((hit) => ({
        _id: hit._id,
        _index: hit._index,
        _source: hit._source,
        _score: 1.0,
      })),
    },
  };
}

export const withMockLog = (client: unknown, mock = jest.fn()) => {
  Object.defineProperty(client as unknown, 'log', { value: mock });
  return mock;
};
