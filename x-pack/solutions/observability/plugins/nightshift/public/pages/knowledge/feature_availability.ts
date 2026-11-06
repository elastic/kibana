/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';

export interface FeatureAvailability {
  isEnabled: boolean;
  isLoading: boolean;
}

/** An `enabled: false` query stays loading, so `fetchStatus` tells unanswered from pending. */
export const toFeatureAvailability = <TData extends { enabled?: boolean }>({
  data,
  isLoading,
  fetchStatus,
}: Pick<UseQueryResult<TData>, 'data' | 'isLoading' | 'fetchStatus'>): FeatureAvailability => ({
  isEnabled: data?.enabled ?? false,
  isLoading: isLoading && fetchStatus !== 'idle',
});
