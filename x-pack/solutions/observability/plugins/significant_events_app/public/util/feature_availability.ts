/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';

/** A feature gated by a server-side query, with loading kept distinct from off. */
export interface FeatureAvailability {
  /** True only once the query has answered "on". False while loading, and when off. */
  isEnabled: boolean;
  /** True while the first answer is still in flight. */
  isLoading: boolean;
}

/**
 * A query with `enabled: false` never leaves react-query's loading state, so
 * `fetchStatus` is what distinguishes an unanswered query from a pending one.
 */
export const toFeatureAvailability = <TData extends { enabled?: boolean }>({
  data,
  isLoading,
  fetchStatus,
}: Pick<UseQueryResult<TData>, 'data' | 'isLoading' | 'fetchStatus'>): FeatureAvailability => ({
  isEnabled: data?.enabled ?? false,
  isLoading: isLoading && fetchStatus !== 'idle',
});
