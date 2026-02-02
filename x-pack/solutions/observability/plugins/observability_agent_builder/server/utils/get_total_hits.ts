/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

export function getTotalHits(response: Pick<SearchResponse<unknown>, 'hits'> | undefined): number {
  const total = response?.hits?.total;
  return typeof total === 'number' ? total : total?.value ?? 0;
}
