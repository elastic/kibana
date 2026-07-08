/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { PersistedEntityAiSummary } from '@kbn/entity-store/common';
import { useEntityAnalyticsRoutes } from '../../../api/api';

export const PERSISTED_AI_SUMMARY_QUERY_KEY = 'PERSISTED_AI_SUMMARY';

export interface UseFetchPersistedAiSummaryResult {
  /** The persisted summary, or null when none exists or the user lacks metadata read access. */
  summary: PersistedEntityAiSummary | null;
  /** False when the user has no metadata read access — caller should offer on-demand generation. */
  canRead: boolean;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Loads the persisted AI summary for an entity from the metadata datastream on
 * flyout open. Does not regenerate on close / click-away — generation is only
 * user-triggered. When the user cannot read the metadata index, `canRead` is
 * false and the flyout falls back to on-demand generation.
 */
export const useFetchPersistedAiSummary = ({
  entityType,
  entityIdentifier,
  skip,
}: {
  entityType: string;
  entityIdentifier: string;
  skip?: boolean;
}): UseFetchPersistedAiSummaryResult => {
  const { fetchPersistedAiSummary } = useEntityAnalyticsRoutes();

  const { data, isLoading, refetch } = useQuery({
    queryKey: [PERSISTED_AI_SUMMARY_QUERY_KEY, entityType, entityIdentifier],
    queryFn: ({ signal }) => fetchPersistedAiSummary({ entityType, entityIdentifier }, signal),
    enabled: !skip && Boolean(entityIdentifier),
  });

  return useMemo(
    () => ({
      summary: data?.summary ?? null,
      canRead: data?.canRead ?? false,
      isLoading,
      refetch,
    }),
    [data?.summary, data?.canRead, isLoading, refetch]
  );
};
