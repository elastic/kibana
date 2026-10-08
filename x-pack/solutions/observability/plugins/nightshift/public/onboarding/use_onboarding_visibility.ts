/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import {
  INVESTIGATION_STATUSES,
  type InvestigationStatus,
  type ListInvestigationItem,
} from '@kbn/nightshift-investigations-plugin/common';
import { useFetchAutomations } from '../automations/hooks/use_automations';
import { useFetchInvestigations } from '../hooks/use_fetch_investigations';

const ALL_INVESTIGATION_STATUSES: InvestigationStatus[] = [...INVESTIGATION_STATUSES];

/** Keeps the trial investigation's status fresh while onboarding shows it. */
const TRIAL_INVESTIGATION_REFETCH_INTERVAL_MS = 5_000;

export interface OnboardingVisibility {
  /** True until it is known whether the space still onboards. */
  isLoading: boolean;
  showOnboarding: boolean;
  /** The space's most recent investigation: the trial investigation of steps 2 and 3. */
  latestInvestigation?: ListInvestigationItem;
  /** "I'll do it later": hides onboarding until the page reloads. */
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
  const [isDismissed, setIsDismissed] = useState(false);
  const automations = useFetchAutomations({ enabled: isEnabled && canUseAutomations });
  const hasAutomation = (automations.data?.automations.length ?? 0) > 0;
  const isOnboardingCandidate =
    isEnabled && !isDismissed && (forceOnboarding || (canUseAutomations && !hasAutomation));

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

  const dismiss = useCallback(() => setIsDismissed(true), []);

  return {
    isLoading,
    showOnboarding: isEnabled && !isDismissed && (forceOnboarding || (!isLoading && !isDone)),
    latestInvestigation,
    dismiss,
  };
};
