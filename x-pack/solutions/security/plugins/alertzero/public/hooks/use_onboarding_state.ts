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
import { queryKeys } from '../query_keys';
import { usePendingProposals } from './use_proposals_api';
import { useWatches } from './use_watches_api';

/**
 * Derived onboarding state. There is no stored step — the state is recomputed from the
 * `alertzero:enabled` advanced setting, the installed watches, and any generated proposals.
 *
 * S0 `disabled` — advanced setting is `false`. Show the CTA + enable toggle.
 * S1 `no-watches` — enabled but no watches installed. Show empty state + watch catalog link.
 * S2 `awaiting-first-run` — watches installed but none have produced a run yet.
 * `active` — a run exists; onboarding is complete and the app no longer needs this page.
 */
export type OnboardingState = 'disabled' | 'no-watches' | 'awaiting-first-run' | 'active';

export interface UseOnboardingStateResult {
  state: OnboardingState;
  /** Source of truth: the `alertzero:enabled` advanced setting, kept reactive to uiSettings changes. */
  enabled: boolean;
  hasWatches: boolean;
  hasRun: boolean;
  /** Watches and proposals queries are still loading. */
  isLoading: boolean;
  /** Whether the current user may flip the setting (`capabilities.advancedSettings.save`). */
  canToggle: boolean;
  watchesError: unknown;
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

  const { data: watchesData, isLoading: watchesLoading, error: watchesError } = useWatches();
  const { data: proposalsData, isLoading: proposalsLoading } = usePendingProposals();

  const watches = watchesData?.watches ?? [];
  const proposals = proposalsData?.proposals ?? [];

  const hasWatches = watches.length > 0;
  const hasRun =
    proposals.length > 0 ||
    watches.some((watch) => (watch.recentRuns?.length ?? 0) > 0 || watch.metrics?.lastRun != null);

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
    isLoading: watchesLoading || proposalsLoading,
    canToggle,
    watchesError,
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
      }),
    onSuccess: () => {
      services.uiSettings?.set(ALERTZERO_ENABLED_SETTING, true);
      void queryClient.invalidateQueries({ queryKey: queryKeys.watches.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
    },
  });
};
