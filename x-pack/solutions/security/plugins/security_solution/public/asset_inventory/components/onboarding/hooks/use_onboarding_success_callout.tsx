/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { LOCAL_STORAGE_ONBOARDING_SUCCESS_CALLOUT_KEY } from '../../../constants';

/**
 * Hook to manage the visibility of the onboarding success callout
 * initializing as false by default, so the callout is only displayed when manually enabled
 * during the onboarding process.
 */
export const useOnboardingSuccessCallout = () => {
  const [isOnboardingSuccessCalloutVisible, setOnboardingSuccessCalloutVisible] =
    useLocalStorage<boolean>(LOCAL_STORAGE_ONBOARDING_SUCCESS_CALLOUT_KEY, false);

  const hideOnboardingSuccessCallout = () => setOnboardingSuccessCalloutVisible(false);

  const showOnboardingSuccessCallout = () => setOnboardingSuccessCalloutVisible(true);

  return {
    isOnboardingSuccessCalloutVisible,
    hideOnboardingSuccessCallout,
    showOnboardingSuccessCallout,
  };
};
