/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { useFetchAutomations } from '../../../data/automations/use_automations';
import { useKibana } from '../../../hooks/use_kibana';
import { useFetchLatestInvestigation } from './use_fetch_latest_investigation';

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
  latestInvestigation?: InvestigationSummary;
  /** "Skip this step": hides onboarding in this space and browser (local storage). */
  dismiss: () => void;
}

/**
 * Onboarding has no state of its own: it is done once the space has an automation or an
 * investigation. Without automations (feature flag off) only the investigation counts.
 *
 * An active session stays open after the first automation is created so the saved card and Done
 * button can appear (likewise when its trial investigation appears); Done / "Skip this step" call
 * `dismiss`. Return visits with an automation or an investigation skip onboarding.
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

  const [sessionOpen, setSessionOpen] = useState(false);

  // Keep polling the trial investigation while onboarding is (or stays) on screen — including a
  // latched session after the first automation is saved, so the trial card can flip to ready.
  const shouldPollTrial =
    forceOnboarding ||
    (sessionOpen && !isDismissed) ||
    (!isDismissed && canUseAutomations && !hasAutomation && !automations.isError);
  const investigations = useFetchLatestInvestigation({
    enabled: isEnabled,
    refetchInterval: isEnabled && shouldPollTrial ? TRIAL_INVESTIGATION_REFETCH_INTERVAL_MS : false,
  });
  const { latestInvestigation } = investigations;
  const hasInvestigation = latestInvestigation != null;

  const isLoading =
    isEnabled &&
    ((canUseAutomations && automations.isInitialLoading) || investigations.isInitialLoading);

  // Latch once both lookups have settled on an empty space (no automation, no investigation), so
  // creating the trial investigation or the first automation does not tear the page down before
  // Done. Do not latch on a failed automations lookup, and do not latch while the trial
  // investigation is still loading (avoids a first-investigation flash).
  useEffect(() => {
    if (
      forceOnboarding ||
      (!isDismissed &&
        !isLoading &&
        canUseAutomations &&
        !hasAutomation &&
        !hasInvestigation &&
        !automations.isError)
    ) {
      setSessionOpen(true);
    }
  }, [
    forceOnboarding,
    isDismissed,
    isLoading,
    canUseAutomations,
    hasAutomation,
    hasInvestigation,
    automations.isError,
  ]);
  useEffect(() => {
    if (isDismissed) setSessionOpen(false);
  }, [isDismissed]);

  const isDone =
    automations.isError ||
    hasAutomation ||
    hasInvestigation ||
    (!canUseAutomations && investigations.error != null);

  const dismiss = useCallback(() => setIsDismissed(true), [setIsDismissed]);

  return {
    isLoading,
    showOnboarding:
      isEnabled &&
      (forceOnboarding || (sessionOpen && !isDismissed) || (!isDismissed && !isLoading && !isDone)),
    latestInvestigation,
    dismiss,
  };
};
