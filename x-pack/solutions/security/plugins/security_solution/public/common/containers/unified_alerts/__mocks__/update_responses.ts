/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

export const getUpdateByQueryResponseMock = (
  overrides?: Partial<estypes.UpdateByQueryResponse>
): estypes.UpdateByQueryResponse => ({
  took: 10,
  timed_out: false,
  total: 5,
  updated: 5,
  deleted: 0,
  batches: 1,
  version_conflicts: 0,
  noops: 0,
  retries: {
    bulk: 0,
    search: 0,
  },
  throttled_millis: 0,
  requests_per_second: -1,
  throttled_until_millis: 0,
  ...overrides,
});
