/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import { useQuery } from '@kbn/react-query';
import {
  KIS_ONBOARDING_IN_PROGRESS_STATUSES,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import { useCallback, useMemo } from 'react';
import { ONBOARDING_START_GRACE_MS, RUNNING_POLL_INTERVAL_MS } from '../../common/constants';
import { useFetchErrorToast } from '../../hooks/use_fetch_error_toast';
import { useFetchFeatures } from './use_fetch_features';
import { useFetchDiscoveryQueries } from '../rules/use_fetch_discovery_queries';
import { useFetchSources } from '../sources/use_fetch_sources';
import { useOnboardingApi } from '../sources/use_onboarding_api';
import { SOURCE_ONBOARDING_STATUS_QUERY_KEY } from '../query_keys';

const QUERIES_MAX_PER_PAGE = 1000;
const ONBOARDING_STATUS_BATCH_SIZE = 1000;

interface OnboardingSource {
  id: string;
  enabled: boolean;
  esql_updated_at: string;
}

// A source changed within the grace period may not have its run scheduled yet.
const isAwaitingRunStart = (
  sources: OnboardingSource[],
  statuses: Record<string, SignificantEventsWorkflowStatusResult>
): boolean =>
  sources.some(
    ({ id, enabled, esql_updated_at: queryVersion }) =>
      enabled &&
      Date.now() - Date.parse(queryVersion) < ONBOARDING_START_GRACE_MS &&
      !KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(statuses[id]?.status)
  );

export function useFetchKnowledgeIndicators() {
  const { data: sources } = useFetchSources();
  const { getOnboardingStatuses } = useOnboardingApi();
  const showFetchErrorToast = useFetchErrorToast();
  const sourceIds = useMemo(() => sources?.map(({ id }) => id).sort() ?? [], [sources]);
  const {
    data: featuresData,
    isLoading: featuresLoading,
    refetch: refetchFeatures,
  } = useFetchFeatures();

  const queriesFetchState = useFetchDiscoveryQueries({
    query: '',
    page: 1,
    perPage: QUERIES_MAX_PER_PAGE,
    status: ['active', 'draft'],
  });

  const knowledgeIndicators = useMemo<KnowledgeIndicator[]>(() => {
    const featureKnowledgeIndicators = (featuresData?.features ?? []).map((feature) => ({
      kind: 'feature' as const,
      feature,
    }));

    const queryKnowledgeIndicators = (queriesFetchState.data?.queries ?? []).map((queryRow) => ({
      kind: 'query' as const,
      query: queryRow.query,
      rule: {
        backed: queryRow.rule_backed,
        id: queryRow.query.id,
      },
      source_id: queryRow.source_id,
    }));

    return [...featureKnowledgeIndicators, ...queryKnowledgeIndicators];
  }, [featuresData?.features, queriesFetchState.data?.queries]);

  const isLoading = featuresLoading || queriesFetchState.isLoading;

  const isEmpty = !isLoading && knowledgeIndicators.length === 0;

  const occurrencesByQueryId = useMemo(
    () =>
      Object.fromEntries(
        (queriesFetchState.data?.queries ?? []).map((queryRow) => [
          queryRow.query.id,
          queryRow.occurrences,
        ])
      ),
    [queriesFetchState.data?.queries]
  );

  const refetchQueries = queriesFetchState.refetch;
  const refetch = useCallback(() => {
    void refetchQueries();
    void refetchFeatures();
  }, [refetchQueries, refetchFeatures]);

  useQuery<Record<string, SignificantEventsWorkflowStatusResult>, Error>({
    queryKey: [...SOURCE_ONBOARDING_STATUS_QUERY_KEY, sourceIds],
    queryFn: async () => {
      const statuses: Record<string, SignificantEventsWorkflowStatusResult> = {};
      for (let offset = 0; offset < sourceIds.length; offset += ONBOARDING_STATUS_BATCH_SIZE) {
        Object.assign(
          statuses,
          await getOnboardingStatuses(
            sourceIds.slice(offset, offset + ONBOARDING_STATUS_BATCH_SIZE)
          )
        );
      }
      return statuses;
    },
    enabled: sourceIds.length > 0,
    refetchInterval: (statuses = {}) =>
      Object.values(statuses).some(({ status }) =>
        KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(status)
      ) || isAwaitingRunStart(sources ?? [], statuses)
        ? RUNNING_POLL_INTERVAL_MS
        : false,
    // Refresh on the terminal response too, including a run that finished while navigating here.
    onSuccess: refetch,
    onError: showFetchErrorToast,
  });

  return {
    knowledgeIndicators,
    occurrencesByQueryId,
    isLoading,
    isEmpty,
    refetch,
  };
}
