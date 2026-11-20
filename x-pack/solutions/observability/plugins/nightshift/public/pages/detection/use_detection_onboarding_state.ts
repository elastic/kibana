/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useDetectionOverview } from '../../data/detection_overview/use_detection_overview';
import { useFetchSources } from '../../data/sources/use_fetch_sources';
import {
  INITIAL_RECOMMENDED_SOURCES_CREATION_STATE,
  type RecommendedSourcesCreationState,
} from '../../components/entities/source/recommended_sources/recommended_sources_table';

const NO_SOURCES_HISTORY_RANGE = { from: 'now-10y', to: 'now' } as const;

type NoSourcesHistoryState = 'unknown' | 'empty' | 'has_history';
type SourceCreationView = 'hidden' | 'disabled' | 'enabled';

type DetectionOnboardingView =
  | { type: 'loading' }
  | {
      type: 'onboarding';
      hasHistoryLookupFailed: boolean;
      sourceCreation: 'disabled';
    }
  | {
      type: 'workspace';
      hasHistoryLookupFailed: boolean;
      sourceCreation: SourceCreationView;
      showNoSourcesCallout: boolean;
    };

export const useDetectionOnboardingState = (): {
  view: DetectionOnboardingView;
  onCreationStateChange: (state: RecommendedSourcesCreationState) => void;
  retryHistoryLookup: () => void;
} => {
  const sources = useFetchSources({ select: (sourceList) => sourceList.length });
  const historyOverview = useDetectionOverview(NO_SOURCES_HISTORY_RANGE, {
    enabled: sources.data === 0,
    showErrorToast: false,
    refetchOnWindowFocus: false,
  });
  const [sourceCreationState, setSourceCreationState] = useState<RecommendedSourcesCreationState>(
    INITIAL_RECOMMENDED_SOURCES_CREATION_STATE
  );
  const [resolvedNoSourcesHistoryState, setResolvedNoSourcesHistoryState] =
    useState<NoSourcesHistoryState>('unknown');

  const hasNoSources = sources.data === 0;
  const hasConfiguredSources = (sources.data ?? 0) > 0;
  const isDetectionEnabled =
    hasConfiguredSources ||
    (sourceCreationState.hasCreatedSources &&
      (sources.isLoading || sources.isFetching || sources.isError));
  const hasHistory =
    (historyOverview.data?.detections ?? 0) + (historyOverview.data?.significant_events ?? 0) > 0;
  const hasFreshSuccessfulHistoryLookup =
    historyOverview.data !== undefined && !historyOverview.isError && !historyOverview.isFetching;
  const noSourcesHistoryState = hasFreshSuccessfulHistoryLookup
    ? hasHistory
      ? 'has_history'
      : 'empty'
    : resolvedNoSourcesHistoryState;
  const shouldRetainSourceCreation =
    sourceCreationState.isCreating || sourceCreationState.hasFailedDrafts;

  useEffect(() => {
    if (!hasNoSources) {
      setResolvedNoSourcesHistoryState('unknown');
      return;
    }
    if (hasFreshSuccessfulHistoryLookup) {
      setResolvedNoSourcesHistoryState(hasHistory ? 'has_history' : 'empty');
    }
  }, [hasFreshSuccessfulHistoryLookup, hasHistory, hasNoSources]);

  useEffect(() => {
    if (
      !sourceCreationState.hasCreatedSources ||
      sources.isLoading ||
      sources.isFetching ||
      sources.isError
    ) {
      return;
    }
    if ((sources.data ?? 0) > 0 && !shouldRetainSourceCreation) {
      setSourceCreationState(INITIAL_RECOMMENDED_SOURCES_CREATION_STATE);
      return;
    }
    if (sources.data === 0) {
      setSourceCreationState((current) => ({ ...current, hasCreatedSources: false }));
    }
  }, [
    shouldRetainSourceCreation,
    sourceCreationState.hasCreatedSources,
    sources.data,
    sources.isError,
    sources.isFetching,
    sources.isLoading,
  ]);

  const isLoading =
    !shouldRetainSourceCreation &&
    (sources.isLoading ||
      (hasNoSources &&
        (historyOverview.isLoading ||
          (historyOverview.isFetching && resolvedNoSourcesHistoryState === 'unknown'))));

  const retryHistoryLookup = () => {
    void historyOverview.refetch();
  };

  if (isLoading) {
    return {
      view: { type: 'loading' },
      onCreationStateChange: setSourceCreationState,
      retryHistoryLookup,
    };
  }

  const hasHistoryLookupFailed = hasNoSources && historyOverview.isError;
  const showInitialOnboarding =
    hasNoSources && noSourcesHistoryState === 'empty' && !isDetectionEnabled;

  if (showInitialOnboarding) {
    return {
      view: {
        type: 'onboarding',
        hasHistoryLookupFailed,
        sourceCreation: 'disabled',
      },
      onCreationStateChange: setSourceCreationState,
      retryHistoryLookup,
    };
  }

  return {
    view: {
      type: 'workspace',
      hasHistoryLookupFailed,
      sourceCreation: shouldRetainSourceCreation
        ? isDetectionEnabled
          ? 'enabled'
          : 'disabled'
        : 'hidden',
      showNoSourcesCallout: hasNoSources && noSourcesHistoryState === 'has_history',
    },
    onCreationStateChange: setSourceCreationState,
    retryHistoryLookup,
  };
};
