/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import {
  KIsOnboardingStep,
  NIGHTSHIFT_DEFAULT_MODELS,
  SignificantEventsWorkflowStatus,
  KIS_ONBOARDING_IN_PROGRESS_STATUSES,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFetchSources } from '../../../../hooks/use_fetch_sources';
import type { ScheduleOnboardingOptions } from '../../../../hooks/use_onboarding_api';
import { useBulkOnboarding } from '../../hooks/use_bulk_onboarding';
import type { OnboardingConfig } from '../shared/types';

interface ConnectorState {
  resolvedConnectorId: string | undefined;
  loading: boolean;
}

const NO_SOURCES: NightshiftSource[] = [];

const featuresConnectors: ConnectorState = {
  resolvedConnectorId: NIGHTSHIFT_DEFAULT_MODELS.kiExtraction,
  loading: false,
};

const queriesConnectors: ConnectorState = {
  resolvedConnectorId: NIGHTSHIFT_DEFAULT_MODELS.kiQueryGeneration,
  loading: false,
};

interface KiGenerationContextValue {
  /** Every source of the space, disabled ones included; only enabled sources can be onboarded. */
  sources: NightshiftSource[];
  isSourcesLoading: boolean;
  /** The last source list request failed; `sources` then holds what was cached, if anything. */
  isSourcesError: boolean;
  refetchSources: () => void;
  isInitialGenerationStatusLoading: boolean;
  generatingStreamNames: string[];
  isGenerating: boolean;
  isScheduling: boolean;
  streamStatusMap: Record<string, SignificantEventsWorkflowStatusResult>;
  onboardingConfig: OnboardingConfig;
  setOnboardingConfig: (config: OnboardingConfig) => void;
  featuresConnectors: ConnectorState;
  queriesConnectors: ConnectorState;
  bulkOnboardAll: (streamNames: string[]) => Promise<string[]>;
  bulkOnboardFeaturesOnly: (streamNames: string[]) => Promise<string[]>;
  bulkOnboardQueriesOnly: (streamNames: string[]) => Promise<string[]>;
  bulkScheduleOnboarding: (
    streamNames: string[],
    options?: ScheduleOnboardingOptions
  ) => Promise<string[]>;
  cancelOnboarding: (streamName: string) => Promise<void>;
}

const KiGenerationReactContext = createContext<KiGenerationContextValue | null>(null);

interface KiGenerationProviderProps {
  children: React.ReactNode;
  onCompleted?: () => void;
  onFailed?: (error: string) => void;
}

export function KiGenerationProvider({
  children,
  onCompleted,
  onFailed,
}: KiGenerationProviderProps) {
  const [generatingStreams, setGeneratingStreams] = useState<Set<string>>(new Set());
  const [streamStatusMap, setStreamStatusMap] = useState<
    Record<string, SignificantEventsWorkflowStatusResult>
  >({});
  const initialStatusFetchDoneRef = useRef(false);
  // Dedup guard: every refetch of the source list returns a new array, which
  // re-fires the status-fetch effect. This ref maps each enqueued source id to the query version
  // (`esql_updated_at`) it was enqueued with, so only new sources and sources whose query changed
  // (which resets their onboarding status) trigger network calls.
  const enqueuedQueryVersionsRef = useRef<Map<string, string>>(new Map());

  const [onboardingConfig, setOnboardingConfig] = useState<OnboardingConfig>({
    steps: [KIsOnboardingStep.FeaturesIdentification, KIsOnboardingStep.QueriesGeneration],
    connectors: {
      features: featuresConnectors.resolvedConnectorId,
      queries: queriesConnectors.resolvedConnectorId,
    },
  });

  const sourcesFetch = useFetchSources();
  const fetchedSources = sourcesFetch.data;
  const isSourcesLoading = sourcesFetch.isLoading;
  const isSourcesError = sourcesFetch.isError;
  const refetchSources = sourcesFetch.refetch;

  // Adds streams discovered as InProgress (e.g. on initial status fetch after
  // page refresh) and removes streams that reach a terminal state. Callback
  // forwarding is gated on the initial-fetch flag so initial-load updates
  // don't trigger consumer side effects (like error toasts).
  const onStreamStatusUpdate = useCallback(
    (streamName: string, statusResult: SignificantEventsWorkflowStatusResult) => {
      setStreamStatusMap((current) => ({ ...current, [streamName]: statusResult }));

      const isInProgress = KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(statusResult.status);

      setGeneratingStreams((current) => {
        const has = current.has(streamName);
        if (isInProgress === has) return current;
        const next = new Set(current);
        if (isInProgress) {
          next.add(streamName);
        } else {
          next.delete(streamName);
        }
        return next;
      });

      if (initialStatusFetchDoneRef.current) {
        if (statusResult.status === SignificantEventsWorkflowStatus.Failed) {
          onFailed?.(statusResult.error ?? 'Unknown error');
        }
        if (statusResult.status === SignificantEventsWorkflowStatus.Completed) {
          onCompleted?.();
        }
      }
    },
    [onCompleted, onFailed]
  );

  const bulkOnboarding = useBulkOnboarding({ onboardingConfig, onStreamStatusUpdate });
  const {
    onboardingStatusUpdateQueue,
    processStatusUpdateQueue,
    bulkOnboardAll: rawBulkOnboardAll,
    bulkOnboardFeaturesOnly: rawBulkOnboardFeaturesOnly,
    bulkOnboardQueriesOnly: rawBulkOnboardQueriesOnly,
    bulkScheduleOnboarding: rawBulkScheduleOnboarding,
  } = bulkOnboarding;

  useEffect(() => {
    if (!fetchedSources) return;

    let hasNew = false;
    fetchedSources.forEach(({ id, esql_updated_at: queryVersion }) => {
      if (enqueuedQueryVersionsRef.current.get(id) !== queryVersion) {
        enqueuedQueryVersionsRef.current.set(id, queryVersion);
        onboardingStatusUpdateQueue.add(id);
        hasNew = true;
      }
    });
    if (hasNew) {
      processStatusUpdateQueue().finally(() => {
        initialStatusFetchDoneRef.current = true;
      });
    }
  }, [fetchedSources, onboardingStatusUpdateQueue, processStatusUpdateQueue]);

  const isGenerating = generatingStreams.size > 0;
  const generatingStreamNames = useMemo(() => Array.from(generatingStreams), [generatingStreams]);

  // True until we've received at least one status result for every source, so
  // consumers can defer rendering empty/generating UI until the generating set
  // is known. Once false, stays false — transient refetches of the source list
  // must not flash the loading panel again.
  const isInitialGenerationStatusLoading = useMemo(() => {
    if (initialStatusFetchDoneRef.current) return false;
    if (isSourcesLoading) return true;
    // A failed source list leaves nothing to wait for; the loading panel would never clear.
    if (!fetchedSources) return false;
    return fetchedSources.some(({ id }) => !(id in streamStatusMap));
  }, [isSourcesLoading, fetchedSources, streamStatusMap]);

  const withGeneratingTracking = useCallback(
    (action: (streamNames: string[]) => Promise<string[]>) =>
      async (streamNames: string[]): Promise<string[]> => {
        if (streamNames.length > 0) {
          setGeneratingStreams((current) => new Set([...current, ...streamNames]));
        }
        const succeeded = await action(streamNames);
        if (succeeded.length < streamNames.length) {
          const succeededSet = new Set(succeeded);
          const failed = streamNames.filter((s) => !succeededSet.has(s));
          setGeneratingStreams((current) => {
            const next = new Set(current);
            failed.forEach((s) => next.delete(s));
            return next;
          });
        }
        return succeeded;
      },
    []
  );

  const bulkOnboardAll = useMemo(
    () => withGeneratingTracking(rawBulkOnboardAll),
    [withGeneratingTracking, rawBulkOnboardAll]
  );
  const bulkOnboardFeaturesOnly = useMemo(
    () => withGeneratingTracking(rawBulkOnboardFeaturesOnly),
    [withGeneratingTracking, rawBulkOnboardFeaturesOnly]
  );
  const bulkOnboardQueriesOnly = useMemo(
    () => withGeneratingTracking(rawBulkOnboardQueriesOnly),
    [withGeneratingTracking, rawBulkOnboardQueriesOnly]
  );
  const bulkScheduleOnboarding = useCallback(
    (streamNames: string[], options?: ScheduleOnboardingOptions) =>
      withGeneratingTracking((names) => rawBulkScheduleOnboarding(names, options))(streamNames),
    [withGeneratingTracking, rawBulkScheduleOnboarding]
  );

  const value = useMemo<KiGenerationContextValue>(
    () => ({
      isScheduling: bulkOnboarding.isScheduling,
      cancelOnboarding: bulkOnboarding.cancelOnboarding,
      sources: fetchedSources ?? NO_SOURCES,
      isSourcesLoading,
      isSourcesError,
      refetchSources,
      isInitialGenerationStatusLoading,
      generatingStreamNames,
      isGenerating,
      streamStatusMap,
      onboardingConfig,
      setOnboardingConfig,
      featuresConnectors,
      queriesConnectors,
      bulkOnboardAll,
      bulkOnboardFeaturesOnly,
      bulkOnboardQueriesOnly,
      bulkScheduleOnboarding,
    }),
    [
      bulkOnboarding.isScheduling,
      bulkOnboarding.cancelOnboarding,
      fetchedSources,
      isSourcesLoading,
      isSourcesError,
      refetchSources,
      isInitialGenerationStatusLoading,
      generatingStreamNames,
      isGenerating,
      streamStatusMap,
      onboardingConfig,
      setOnboardingConfig,
      bulkOnboardAll,
      bulkOnboardFeaturesOnly,
      bulkOnboardQueriesOnly,
      bulkScheduleOnboarding,
    ]
  );

  return (
    <KiGenerationReactContext.Provider value={value}>{children}</KiGenerationReactContext.Provider>
  );
}

export function useKiGeneration(): KiGenerationContextValue {
  const context = useContext(KiGenerationReactContext);
  if (!context) {
    throw new Error('useKiGeneration must be used within KiGenerationProvider');
  }
  return context;
}
