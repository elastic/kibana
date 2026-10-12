/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  ALERTZERO_ENABLED_SETTING,
  ALERTZERO_ONBOARDING_ENABLE_URL,
  API_VERSIONS,
} from '@kbn/alertzero-common';
import { queryKeys as platformQueryKeys } from '@kbn/agentic-investigations-plugin/public';
import { queryKeys } from '../query_keys';
import { DEFAULT_PROPOSALS_WINDOW_HOURS, useProposalsList } from './use_proposals_api';
import { retryOnceOnTransientError } from './use_watches_api';
import { useWorkers } from './use_workers_api';
import {
  ENABLE_SUCCESS_TOAST_BODY,
  ENABLE_SUCCESS_TOAST_TITLE,
} from '../pages/onboarding/translations';
import { fireConfetti } from '../components/confetti';

/**
 * Derived onboarding state. There is no stored step — the state is recomputed from the
 * `alertzero:enabled` advanced setting plus the space's live Worker installation and run
 * data, with generated proposals as a secondary completion signal.
 *
 * The Watch catalog (`/watches`) is deliberately NOT the source: it answers with the catalog
 * placeholders for every space (`recentRuns: []`, `metrics.lastRun: null`), so it cannot say
 * whether this space has workers installed or has ever run one. `/workers` can: its
 * `settingsRevision` is null until the per-space managed Worker is installed, and `lastRun`
 * is the real invocation timestamp.
 *
 * S0 `disabled` — advanced setting is `false`. Show the CTA + enable toggle.
 * S1 `no-watches` — enabled but no workers installed. Show empty state + watch catalog link.
 * S2 `awaiting-first-run` — workers installed but none have produced a run yet.
 * `active` — a run exists; onboarding is complete and the app no longer needs this page.
 */
export type OnboardingState = 'disabled' | 'no-watches' | 'awaiting-first-run' | 'active';

export interface UseOnboardingStateResult {
  state: OnboardingState;
  /** Source of truth: the `alertzero:enabled` advanced setting, kept reactive to uiSettings changes. */
  enabled: boolean;
  hasWatches: boolean;
  hasRun: boolean;
  /** Workers and proposals queries are still loading. */
  isLoading: boolean;
  /** Whether the current user may flip the setting (`capabilities.advancedSettings.save`). */
  canToggle: boolean;
  /**
   * The live installation/run read failed. The derived state is then NOT trustworthy: a failed
   * read must never pass for an empty installation, so consumers must not treat S1 as real.
   */
  hasQueryError: boolean;
}

export const useOnboardingState = (): UseOnboardingStateResult => {
  const { services } = useKibana();
  const uiSettings = services.uiSettings;

  const [enabled, setEnabled] = useState<boolean>(() =>
    uiSettings ? uiSettings.get<boolean>(ALERTZERO_ENABLED_SETTING, false) : false
  );

  useEffect(() => {
    if (!uiSettings) {
      return;
    }
    const subscription = uiSettings
      .get$(ALERTZERO_ENABLED_SETTING, false)
      .subscribe((value) => setEnabled(value));
    return () => subscription.unsubscribe();
  }, [uiSettings]);

  const canToggle = services.application?.capabilities?.advancedSettings?.save === true;

  // Live installation/run data. The gate blocks routing on this query, so it uses the
  // bounded retry policy: a persistently-failing backend must be distinguishable from an
  // empty installation in about a second, not after ~11s of spinner.
  const {
    data: workersData,
    isLoading: workersLoading,
    isFetching: workersFetching,
    error: workersError,
  } = useWorkers({ retry: retryOnceOnTransientError });
  const {
    data: proposalsData,
    isLoading: proposalsLoading,
    error: proposalsError,
  } = useProposalsList(DEFAULT_PROPOSALS_WINDOW_HOURS, { retry: retryOnceOnTransientError });

  const workers = workersData?.workers ?? [];
  // Any proposal inside the window — open or closed — is proof a run produced output.
  const proposalCount = proposalsData?.total ?? 0;

  // `settingsRevision` is the contract's install marker: null until the per-space managed
  // Worker has been installed, so it answers "is this space set up" from the live document
  // rather than from the catalog. `lastRun` is the real invocation timestamp, which makes
  // S2 → active fire on an actual run even when that run produced no proposal.
  const hasWatches = workers.some((worker) => worker.settingsRevision != null);
  const hasRun = proposalCount > 0 || workers.some((worker) => worker.lastRun != null);

  const state: OnboardingState = !enabled
    ? 'disabled'
    : !hasWatches
    ? 'no-watches'
    : hasRun
    ? 'active'
    : 'awaiting-first-run';

  return {
    state,
    enabled,
    hasWatches,
    hasRun,
    // A read still in flight can turn an apparently empty space into an installed one, so
    // "no workers yet" while refetching is loading, not an empty installation.
    isLoading: workersLoading || workersFetching || proposalsLoading,
    canToggle,
    hasQueryError: workersError != null || proposalsError != null,
  };
};

/**
 * Flips the `alertzero:enabled` advanced setting on via the enable route. The route is the
 * authoritative source of truth; on success we optimistically update the local uiSettings cache so
 * {@link useOnboardingState} re-derives without a full reload, and refetch watches + proposals.
 */
export const useEnableOnboarding = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (): Promise<unknown> =>
      services.http!.post(ALERTZERO_ONBOARDING_ENABLE_URL, {
        version: API_VERSIONS.internal.v1,
        // The http client does not serialize objects (XHR would coerce them to
        // "[object Object]"); the route's strict zod body requires valid JSON.
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      services.uiSettings?.set(ALERTZERO_ENABLED_SETTING, true);
      // Transient confirmation on top of whatever surface the gate lands the user on
      // (S2 → watch detail, S1 → the no-watches empty state). The toast portal is global.
      services.notifications?.toasts.addSuccess({
        title: ENABLE_SUCCESS_TOAST_TITLE,
        text: ENABLE_SUCCESS_TOAST_BODY,
      });
      // Celebration burst — imperative overlay, survives the gate's route transition.
      fireConfetti();
      void queryClient.invalidateQueries({ queryKey: queryKeys.watches.all });
      // The gate derives its state from the live worker install, so the enable must refresh
      // that read too — otherwise the space still looks empty and the app stays gated.
      void queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      // Grouped proposal queries hang off the shared platform proposals root.
      void queryClient.invalidateQueries({ queryKey: platformQueryKeys.proposals.all });
    },
  });
};
