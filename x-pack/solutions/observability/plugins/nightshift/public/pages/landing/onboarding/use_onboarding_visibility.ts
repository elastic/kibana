/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import {
  useFetchAutomations,
  type Automation,
} from '../../../data/automations/use_automations';
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
  /** Automations already in the space (for the first-automation step). */
  automations: Automation[];
  /** Skip / Done on the last step: hides onboarding in this space and browser (local storage). */
  dismiss: () => void;
}

/**
 * Spaces without automations start onboarding. Creating the first automation during that session
 * does not leave — Skip/Done dismisses. Returning later to a space that already has automations
 * skips onboarding. Without automations (feature flag off) it falls back to "has an investigation".
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
  const automationsQuery = useFetchAutomations({ enabled: isEnabled && canUseAutomations });
  const automations = automationsQuery.data?.automations ?? [];
  const hasAutomation = automations.length > 0;
  const isOnboardingCandidate =
    isEnabled && (forceOnboarding || (!isDismissed && canUseAutomations && !hasAutomation));

  const investigations = useFetchLatestInvestigation({
    enabled: isEnabled,
    refetchInterval: isOnboardingCandidate ? TRIAL_INVESTIGATION_REFETCH_INTERVAL_MS : false,
  });
  const { latestInvestigation } = investigations;

  const isLoading =
    isEnabled &&
    ((canUseAutomations && automationsQuery.isInitialLoading) || investigations.isInitialLoading);

  const isDone = canUseAutomations
    ? automationsQuery.isError || hasAutomation
    : investigations.error != null || latestInvestigation != null;

  // Once onboarding is shown this session, keep it open after the first automation is created
  // until the user hits Skip/Done (matches prototype “Add one more”).
  const [sessionActive, setSessionActive] = useState(false);
  const wouldShowFresh =
    forceOnboarding || (!isDismissed && !isLoading && !isDone);

  useEffect(() => {
    if (wouldShowFresh) {
      setSessionActive(true);
    }
  }, [wouldShowFresh]);

  const dismiss = useCallback(() => {
    setSessionActive(false);
    setIsDismissed(true);
  }, [setIsDismissed]);

  return {
    isLoading,
    showOnboarding:
      isEnabled &&
      (forceOnboarding || (!isDismissed && !isLoading && (!isDone || sessionActive))),
    latestInvestigation,
    automations,
    dismiss,
  };
};
