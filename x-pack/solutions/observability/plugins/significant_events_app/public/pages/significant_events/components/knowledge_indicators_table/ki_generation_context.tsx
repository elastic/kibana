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
  generatingSourceIds: string[];
  isGenerating: boolean;
  isScheduling: boolean;
  sourceStatusMap: Record<string, SignificantEventsWorkflowStatusResult>;
  onboardingConfig: OnboardingConfig;
  setOnboardingConfig: (config: OnboardingConfig) => void;
  featuresConnectors: ConnectorState;
  queriesConnectors: ConnectorState;
  bulkOnboardAll: (sourceIds: string[]) => Promise<string[]>;
  bulkOnboardFeaturesOnly: (sourceIds: string[]) => Promise<string[]>;
  bulkOnboardQueriesOnly: (sourceIds: string[]) => Promise<string[]>;
  bulkScheduleOnboarding: (
    sourceIds: string[],
    options?: ScheduleOnboardingOptions
  ) => Promise<string[]>;
  cancelOnboarding: (sourceId: string) => Promise<void>;
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
  const [generatingSources, setGeneratingSources] = useState<Set<string>>(new Set());
  const [sourceStatusMap, setSourceStatusMap] = useState<
    Record<string, SignificantEventsWorkflowStatusResult>
  >({});
  const initialStatusFetchDoneRef = useRef(false);
  // Separate from the flag above: with an empty catalog no status fetch ever runs, yet the first
  // source created afterwards still needs to be recognised as new.
  const hasSeenSourceListRef = useRef(false);
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

  // Adds sources discovered as InProgress (e.g. on initial status fetch after
  // page refresh) and removes sources that reach a terminal state. Callback
  // forwarding is gated on the initial-fetch flag so initial-load updates
  // don't trigger consumer side effects (like error toasts).
  const onSourceStatusUpdate = useCallback(
    (sourceId: string, statusResult: SignificantEventsWorkflowStatusResult) => {
      setSourceStatusMap((current) => ({ ...current, [sourceId]: statusResult }));

      const isInProgress = KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(statusResult.status);

      setGeneratingSources((current) => {
        const has = current.has(sourceId);
        if (isInProgress === has) return current;
        const next = new Set(current);
        if (isInProgress) {
          next.add(sourceId);
        } else {
          next.delete(sourceId);
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

  const bulkOnboarding = useBulkOnboarding({ onboardingConfig, onSourceStatusUpdate });
  const {
    onboardingStatusUpdateQueue,
    processStatusUpdateQueue,
    expectOnboardingStart,
    bulkOnboardAll: rawBulkOnboardAll,
    bulkOnboardFeaturesOnly: rawBulkOnboardFeaturesOnly,
    bulkOnboardQueriesOnly: rawBulkOnboardQueriesOnly,
    bulkScheduleOnboarding: rawBulkScheduleOnboarding,
  } = bulkOnboarding;

  useEffect(() => {
    if (!fetchedSources) return;

    const isFirstSourceList = !hasSeenSourceListRef.current;
    hasSeenSourceListRef.current = true;
    if (!isFirstSourceList) {
      // The loop below can stay alive while it waits for a run to start; do not hold back the
      // completion and failure callbacks of that run until it ends.
      initialStatusFetchDoneRef.current = true;
    }

    let hasNew = false;
    fetchedSources.forEach(({ id, enabled, esql_updated_at: queryVersion }) => {
      const knownVersion = enqueuedQueryVersionsRef.current.get(id);
      if (knownVersion !== queryVersion) {
        // After the first load, a new id or a new query version is a source the user just created
        // or edited. The server starts its onboarding asynchronously, so keep polling for it.
        if (enabled && (knownVersion !== undefined || !isFirstSourceList)) {
          expectOnboardingStart(id);
          // Optimistic: show the spinner now. The status poll clears it when the grace period
          // ends without a run, and keeps it while a run is going.
          setGeneratingSources((current) => new Set(current).add(id));
        }
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
  }, [
    fetchedSources,
    onboardingStatusUpdateQueue,
    processStatusUpdateQueue,
    expectOnboardingStart,
  ]);

  const isGenerating = generatingSources.size > 0;
  const generatingSourceIds = useMemo(() => Array.from(generatingSources), [generatingSources]);

  // True until we've received at least one status result for every source, so
  // consumers can defer rendering empty/generating UI until the generating set
  // is known. Once false, stays false — transient refetches of the source list
  // must not flash the loading panel again.
  const isInitialGenerationStatusLoading = useMemo(() => {
    if (initialStatusFetchDoneRef.current) return false;
    if (isSourcesLoading) return true;
    // A failed source list leaves nothing to wait for; the loading panel would never clear.
    if (!fetchedSources) return false;
    return fetchedSources.some(({ id }) => !(id in sourceStatusMap));
  }, [isSourcesLoading, fetchedSources, sourceStatusMap]);

  const withGeneratingTracking = useCallback(
    (action: (sourceIds: string[]) => Promise<string[]>) =>
      async (sourceIds: string[]): Promise<string[]> => {
        if (sourceIds.length > 0) {
          setGeneratingSources((current) => new Set([...current, ...sourceIds]));
        }
        const succeeded = await action(sourceIds);
        if (succeeded.length < sourceIds.length) {
          const succeededSet = new Set(succeeded);
          const failed = sourceIds.filter((s) => !succeededSet.has(s));
          setGeneratingSources((current) => {
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
    (sourceIds: string[], options?: ScheduleOnboardingOptions) =>
      withGeneratingTracking((names) => rawBulkScheduleOnboarding(names, options))(sourceIds),
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
      generatingSourceIds,
      isGenerating,
      sourceStatusMap,
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
      generatingSourceIds,
      isGenerating,
      sourceStatusMap,
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
