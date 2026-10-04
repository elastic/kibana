/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';

/**
 * What a caller needs to know about a feature that a server-side query gates.
 *
 * `isEnabled` alone cannot carry this. It reads `false` while the query is in
 * flight, so a caller that cannot tell "off" from "not known yet" treats a
 * feature that is on as absent — and this app's page reacts to an unknown tab by
 * redirecting to the first one, which turned a direct link to a working tab into
 * a bounce before the query answered.
 */
export interface FeatureAvailability {
  /** True only once the query has answered "on". False while loading, and when off. */
  isEnabled: boolean;
  /** True while the first answer is still in flight. */
  isLoading: boolean;
}

/**
 * Narrow an availability query to a `FeatureAvailability`.
 *
 * `isLoading` is react-query's, narrowed by `fetchStatus`: a query with
 * `enabled: false` stays in the loading state forever, because it will never
 * answer. Reporting that as loading would leave the page waiting on a request
 * that is never sent, so a feature whose plugin is not installed would hang
 * instead of reading as off.
 *
 * `isLoading` is only true for the first load, so a caller waits for the first
 * answer and never for a refetch, and a failed request settles as "off" rather
 * than pending.
 */
export const toFeatureAvailability = <TData extends { enabled?: boolean }>({
  data,
  isLoading,
  fetchStatus,
}: Pick<UseQueryResult<TData>, 'data' | 'isLoading' | 'fetchStatus'>): FeatureAvailability => ({
  isEnabled: data?.enabled ?? false,
  isLoading: isLoading && fetchStatus !== 'idle',
});
