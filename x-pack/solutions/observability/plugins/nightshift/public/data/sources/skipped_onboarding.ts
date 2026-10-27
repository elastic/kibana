/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { QueryClient } from '@kbn/react-query';
import { SKIPPED_ONBOARDING_QUERY_KEY } from '../query_keys';

type SourceVersion = Pick<NightshiftSource, 'id' | 'esql_updated_at'>;
type SkippedVersions = Readonly<Record<string, string>>;

/**
 * The server does not store "Onboard source immediately", so the source list cannot say that a
 * created or edited source will not get a run. The save remembers it here, by the query version it
 * produced, before the list is refetched.
 */
export const rememberSkippedOnboarding = (
  queryClient: QueryClient,
  { id, esql_updated_at: queryVersion }: SourceVersion
): void => {
  queryClient.setQueryData<SkippedVersions>(SKIPPED_ONBOARDING_QUERY_KEY, (current) => ({
    ...current,
    [id]: queryVersion,
  }));
};

/** Whether this query version of the source was saved with onboarding off. */
export const hasSkippedOnboarding = (
  queryClient: QueryClient,
  { id, esql_updated_at: queryVersion }: SourceVersion
): boolean =>
  queryClient.getQueryData<SkippedVersions>(SKIPPED_ONBOARDING_QUERY_KEY)?.[id] === queryVersion;
