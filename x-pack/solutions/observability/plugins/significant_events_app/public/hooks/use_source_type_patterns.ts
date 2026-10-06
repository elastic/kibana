/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import type { SourceTypePatterns } from '@kbn/nightshift-shared';
import { useKibana } from './use_kibana';

const SOURCE_TYPE_PATTERNS_QUERY_KEY = ['nightshiftSourceTypePatterns'];

// One read per flyout open. The entry dies with the flyout (gcTime 0) and stays fresh while it
// is open (staleTime Infinity), so validation reuses the in-flight or cached result.
const SOURCE_TYPE_PATTERNS_QUERY_OPTIONS = {
  queryKey: SOURCE_TYPE_PATTERNS_QUERY_KEY,
  gcTime: 0,
  staleTime: Infinity,
};

/**
 * Configured source-type patterns for the open flyout. `getSourceTypePatterns` reuses the
 * request started on mount. `refreshSourceTypePatterns` reads again, so a settings change
 * applies on save without closing the flyout.
 */
export const useSourceTypePatterns = (): {
  getSourceTypePatterns: () => Promise<SourceTypePatterns | null>;
  refreshSourceTypePatterns: () => Promise<SourceTypePatterns | null>;
} => {
  const {
    dependencies: {
      start: { nightshiftSources },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const queryFn = useCallback(() => nightshiftSources.getSourceTypePatterns(), [nightshiftSources]);

  // Starts the fetch on mount. Validation reads it back through fetchQuery.
  useQuery({
    ...SOURCE_TYPE_PATTERNS_QUERY_OPTIONS,
    queryFn,
  });

  const getSourceTypePatterns = useCallback(
    () =>
      queryClient.fetchQuery({
        ...SOURCE_TYPE_PATTERNS_QUERY_OPTIONS,
        queryFn,
      }),
    [queryClient, queryFn]
  );

  const refreshSourceTypePatterns = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: SOURCE_TYPE_PATTERNS_QUERY_KEY,
      refetchType: 'none',
    });
    // staleTime 0 so this call does not reuse the result from mount.
    return queryClient.fetchQuery({
      ...SOURCE_TYPE_PATTERNS_QUERY_OPTIONS,
      staleTime: 0,
      queryFn,
    });
  }, [queryClient, queryFn]);

  return { getSourceTypePatterns, refreshSourceTypePatterns };
};
