/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { AfterKey } from './types';

/**
 * Builds an ES search body that uses a composite aggregation to enumerate
 * all unique `user.name` values from a source index.
 *
 * No matchers or privileged-status scripts — watchlists simply discover
 * every user present in the source.
 *
 * TODO: Add back matchers
 */
export const buildUsersSearchBody = (
  afterKey?: AfterKey,
  pageSize: number = 100
): Omit<estypes.SearchRequest, 'index'> => ({
  size: 0,
  query: { match_all: {} },
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
