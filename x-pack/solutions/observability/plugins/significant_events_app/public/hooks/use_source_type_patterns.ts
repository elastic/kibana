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
 * Configured source-type patterns for the open flyout. The returned function is stable and
 * waits for the same request the flyout started on mount.
 */
export const useSourceTypePatterns = (): {
  getSourceTypePatterns: () => Promise<SourceTypePatterns | null>;
} => {
  const {
    dependencies: {
      start: { nightshiftSources },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  useQuery({
    ...SOURCE_TYPE_PATTERNS_QUERY_OPTIONS,
    queryFn: () => nightshiftSources.getSourceTypePatterns(),
  });

  const getSourceTypePatterns = useCallback(
    () =>
      queryClient.fetchQuery({
        ...SOURCE_TYPE_PATTERNS_QUERY_OPTIONS,
        queryFn: () => nightshiftSources.getSourceTypePatterns(),
      }),
    [nightshiftSources, queryClient]
  );

  return { getSourceTypePatterns };
};
