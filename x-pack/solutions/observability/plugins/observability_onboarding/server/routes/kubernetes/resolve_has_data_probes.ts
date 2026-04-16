/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  isNoShardsAvailableError,
  throwHasDataSearchError,
} from '../../lib/handle_has_data_search_error';

/**
 * Resolves a has-data probe result. Returns true if documents were found,
 * false for no-shards-available errors, and throws on unexpected errors.
 */
export const resolveProbe = (result: PromiseSettledResult<estypes.SearchResponse>): boolean => {
  if (result.status === 'fulfilled') {
    return (result.value.hits.total as estypes.SearchTotalHits).value > 0;
  }
  if (isNoShardsAvailableError(result.reason)) {
    return false;
  }
  throwHasDataSearchError(result.reason);
};
