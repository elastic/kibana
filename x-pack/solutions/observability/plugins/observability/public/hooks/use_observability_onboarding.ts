/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';

export const LOCAL_STORAGE_DISMISS_OBSERVABILITY_ONBOARDING_KEY =
  'DISMISS_OBSERVABILITY_ONBOARDING';

export function useObservabilityOnboarding() {
  const dismissedObservabilityOnboardingLocalStorage = window.localStorage.getItem(
    LOCAL_STORAGE_DISMISS_OBSERVABILITY_ONBOARDING_KEY
  );
  const [isObservabilityOnboardingDismissed, setIsObservabilityOnboardingDismissed] =
    useState<boolean>(JSON.parse(dismissedObservabilityOnboardingLocalStorage || 'false'));

  const dismissObservabilityOnboarding = useCallback(() => {
    window.localStorage.setItem(LOCAL_STORAGE_DISMISS_OBSERVABILITY_ONBOARDING_KEY, 'true');
    setIsObservabilityOnboardingDismissed(true);
  }, []);

  return {
    isObservabilityOnboardingDismissed,
    dismissObservabilityOnboarding,
  };
}
