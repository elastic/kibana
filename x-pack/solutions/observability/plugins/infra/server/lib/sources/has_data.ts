/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSearchClient } from '../metrics/types';

export const hasData = async (index: string, client: ESSearchClient) => {
  const params = {
    index,
    allow_no_indices: true,
    terminate_after: 1,
    ignore_unavailable: true,
    body: {
      size: 0,
    },
  };
  const results = await client(params);
  return results.hits.total.value !== 0;
};
