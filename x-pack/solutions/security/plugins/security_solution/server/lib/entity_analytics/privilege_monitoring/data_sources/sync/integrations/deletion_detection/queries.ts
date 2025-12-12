/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import type { AfterKey } from './deletion_detection';

export const buildFindUsersSearchBody = ({
  timeGte,
  timeLt,
  afterKey,
  pageSize,
}: {
  timeGte: string;
  timeLt: string;
  afterKey?: AfterKey;
  pageSize: number;
}): Omit<estypes.SearchRequest, 'index'> => ({
  size: 0,
  query: {
    range: { '@timestamp': { gte: timeGte, lte: timeLt } },
  },
  aggs: {
    users: {
      composite: {
        size: pageSize,
        sources: [{ username: { terms: { field: 'user.name' } } }],
        ...(afterKey ? { after: afterKey } : {}),
      },
    },
  },
});
