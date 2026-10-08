/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  INVESTIGATION_STATUSES,
  type InvestigationStatus,
  type ListInvestigationItem,
} from '@kbn/nightshift-investigations-plugin/common';
import { useFetchAutomations } from '../automations/hooks/use_automations';
import { useFetchInvestigations } from '../hooks/use_fetch_investigations';
import { useKibana } from '../hooks/use_kibana';

const ALL_INVESTIGATION_STATUSES: InvestigationStatus[] = [...INVESTIGATION_STATUSES];

/** Per space: the base path carries the space prefix (`/s/<space id>`). */
const getDismissedStorageKey = (basePath: string): string =>
  `nightshift.onboarding.dismissed:${basePath || 'default'}`;

/** Keeps the trial investigation's status fresh while onboarding shows it. */
const TRIAL_INVESTIGATION_REFETCH_INTERVAL_MS = 5_000;

export interface OnboardingVisibility {
  /** True until it is known whether the space still onboards. */
  isLoading: boolean;
  showOnboarding: boolean;
  /** The space's most recent investigation: the trial investigation of steps 2 and 3. */
  latestInvestigation?: ListInvestigationItem;
  /** "I'll do it later": hides onboarding in this space and browser (local storage). */
  dismiss: () => void;
}

/**
 * Onboarding is done once the space has an automation; there is no state of its own. Without
 * automations (feature flag off) it falls back to "the space has an investigation".
 */
export const useOnboardingVisibility = ({
  isEnabled,
  canUseAutomations,
  forceOnboarding,
}: {
  /** Investigations are available and the user can manage Nightshift. */
  isEnabled: boolean;
  canUseAutomations: boolean;
  /** `?onboarding=1` */
  forceOnboarding: boolean;
}): OnboardingVisibility => {
  const { http } = useKibana().services;
  const [isDismissed = false, setIsDismissed] = useLocalStorage<boolean>(
    getDismissedStorageKey(http.basePath.get()),
    false
  );
  const automations = useFetchAutomations({ enabled: isEnabled && canUseAutomations });
  const hasAutomation = (automations.data?.automations.length ?? 0) > 0;
  const isOnboardingCandidate =
    isEnabled && (forceOnboarding || (!isDismissed && canUseAutomations && !hasAutomation));

  const investigations = useFetchInvestigations({
    statuses: ALL_INVESTIGATION_STATUSES,
    refetchInterval: isOnboardingCandidate ? TRIAL_INVESTIGATION_REFETCH_INTERVAL_MS : false,
  });
  const [latestInvestigation] = investigations.investigations;

  const isLoading =
    isEnabled &&
    ((canUseAutomations && automations.isInitialLoading) || investigations.isInitialLoading);

  const isDone = canUseAutomations
    ? automations.isError || hasAutomation
    : investigations.error != null || latestInvestigation != null;

  const dismiss = useCallback(() => setIsDismissed(true), [setIsDismissed]);

  return {
    isLoading,
    showOnboarding: isEnabled && (forceOnboarding || (!isDismissed && !isLoading && !isDone)),
    latestInvestigation,
    dismiss,
  };
};
