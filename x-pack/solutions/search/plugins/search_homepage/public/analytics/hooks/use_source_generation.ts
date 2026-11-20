/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import {
  ANALYTICS_GENERATION_AVAILABILITY_PATH,
  ANALYTICS_GENERATION_PATH,
} from '../../../common/analytics';
import type {
  AnalyticsGenerationAvailability,
  AnalyticsGenerationRequest,
} from '../../../common/analytics';
import { useKibana } from '../../hooks/use_kibana';
import { ANALYTICS_TELEMETRY_PREFIX } from '../constants';
import type { AnalyticsEventSource, AnalyticsSourceGeneration } from '../types';
import { useAnalyticsPreferences } from './use_analytics_preferences';

const AVAILABILITY_QUERY_KEY = 'searchHomepageAnalyticsGenerationAvailability';
const GENERATION_QUERY_KEY = 'searchHomepageAnalyticsGeneration';
const AVAILABILITY_STALE_TIME_MS = 5 * 60 * 1000;

export type SourceGenerationStatus =
  /** Nothing will be generated: no model, licence or privilege, or sample data. */
  'unavailable' | 'pending' | 'ready' | 'failed';

export interface SourceGenerationResult {
  status: SourceGenerationStatus;
  /** The latest answer; a part of it is null when too little of it passed validation. */
  data: AnalyticsSourceGeneration | undefined;
  isRegenerating: boolean;
  /** Whether the latest explicit request for new questions failed; `data` keeps the earlier answer. */
  hasRegenerateFailed: boolean;
  /** Has the model write new questions and a new dashboard, replacing the kept ones. */
  regenerate: () => void;
}

export const UNAVAILABLE_SOURCE_GENERATION: SourceGenerationResult = {
  status: 'unavailable',
  data: undefined,
  isRegenerating: false,
  hasRegenerateFailed: false,
  regenerate: () => {},
};

type GenerationFailure = 'failed' | 'insufficient' | 'regenerate_failed';

/**
 * Questions and a dashboard written by a model for one of the user's own event sources, led by the
 * use case picked in this browser. Nothing is
 * requested for sample data, without a source, or when the user cannot use Agent Builder; a failure
 * is counted in usage telemetry and otherwise kept quiet, as the built-in questions remain.
 */
export const useSourceGeneration = (
  source: AnalyticsEventSource | undefined
): SourceGenerationResult => {
  const { agentBuilder, application, http, usageCollection } = useKibana().services;
  const { selectedUseCaseId } = useAnalyticsPreferences();
  const queryClient = useQueryClient();

  const reportFailure = useCallback(
    (failure: GenerationFailure): void => {
      usageCollection?.reportUiCounter(
        'searchHomepage',
        METRIC_TYPE.COUNT,
        `${ANALYTICS_TELEMETRY_PREFIX}_generation_${failure}`
      );
    },
    [usageCollection]
  );

  const canAsk =
    agentBuilder !== undefined &&
    application.capabilities.agentBuilder?.show === true &&
    source !== undefined &&
    !source.isSampleData;

  const availability = useQuery({
    queryKey: [AVAILABILITY_QUERY_KEY],
    queryFn: ({ signal }) =>
      http.get<AnalyticsGenerationAvailability>(ANALYTICS_GENERATION_AVAILABILITY_PATH, { signal }),
    enabled: canAsk,
    retry: false,
    staleTime: AVAILABILITY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
  const isAvailable = canAsk && availability.data?.available === true;

  const request: AnalyticsGenerationRequest | undefined = useMemo(
    () =>
      source === undefined
        ? undefined
        : {
            source: source.name,
            ...(source.timeField !== null && { timeField: source.timeField }),
            ...(selectedUseCaseId !== undefined && { useCaseId: selectedUseCaseId }),
          },
    [source, selectedUseCaseId]
  );
  const queryKey = useMemo(() => [GENERATION_QUERY_KEY, request], [request]);
  const post = useCallback(
    (body: AnalyticsGenerationRequest, signal?: AbortSignal) =>
      http.post<AnalyticsSourceGeneration>(ANALYTICS_GENERATION_PATH, {
        body: JSON.stringify(body),
        signal,
      }),
    [http]
  );

  const generation = useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (request === undefined) {
        throw new Error('No event source to generate analytics for');
      }
      return post(request, signal);
    },
    enabled: isAvailable && request !== undefined,
    retry: false,
    // One generation per source and page visit; the server keeps the answer between visits.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    onError: () => reportFailure('failed'),
    onSuccess: ({ queries, panels }) => {
      if (queries === null || panels === null) {
        reportFailure('insufficient');
      }
    },
  });

  const regeneration = useMutation({
    mutationFn: (body: AnalyticsGenerationRequest) => post({ ...body, refresh: true }),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
    onError: () => reportFailure('regenerate_failed'),
  });
  const { mutate, reset } = regeneration;
  // A failed request for new questions says nothing about the source looked at next.
  useEffect(() => reset(), [queryKey, reset]);
  const regenerate = useCallback((): void => {
    if (request !== undefined && isAvailable) {
      reset();
      mutate(request);
    }
  }, [isAvailable, mutate, request, reset]);

  return useMemo((): SourceGenerationResult => {
    if (!canAsk || availability.isError || availability.data?.available === false) {
      return UNAVAILABLE_SOURCE_GENERATION;
    }
    const getStatus = (): SourceGenerationStatus => {
      if (generation.data !== undefined) {
        return 'ready';
      }
      return generation.isError ? 'failed' : 'pending';
    };

    return {
      status: getStatus(),
      data: generation.data,
      isRegenerating: regeneration.isLoading,
      hasRegenerateFailed: regeneration.isError,
      regenerate,
    };
  }, [
    availability.data?.available,
    availability.isError,
    canAsk,
    generation.data,
    generation.isError,
    regenerate,
    regeneration.isError,
    regeneration.isLoading,
  ]);
};
