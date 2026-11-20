/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesResolveIndexRequest } from '@elastic/elasticsearch/lib/api/types';

/**
 * Options every hunt `_resolve/index` call shares, so the scope check, the caller's coverage
 * read and dataset discovery stay comparable. `ignore_unavailable` keeps one concrete name the
 * caller cannot read, or that does not exist, from failing the whole request.
 */
export const HUNT_RESOLVE_INDEX_OPTIONS: Pick<
  IndicesResolveIndexRequest,
  'allow_no_indices' | 'expand_wildcards' | 'ignore_unavailable'
> = { allow_no_indices: true, expand_wildcards: ['open'], ignore_unavailable: true };
