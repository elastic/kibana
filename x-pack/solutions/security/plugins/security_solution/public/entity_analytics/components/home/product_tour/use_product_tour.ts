/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import { PRODUCT_TOUR_BANNER_STORAGE_KEY, PRODUCT_TOUR_STEPS } from './constants';

export interface ProductTourState {
  isBannerVisible: boolean;
  /** 1-based; 0 when the tour is not running. */
  currentStep: number;
  startTour: () => void;
  nextStep: () => void;
  endTour: () => void;
  dismissBanner: () => void;
}

/** First-visit banner and tour state for the Entity Analytics page; banner dismissal is stored per browser. */
export const useProductTour = (): ProductTourState => {
  const { storage, notifications } = useKibana().services;
  // Tours are turned off globally in some environments, such as functional tests.
  const isTourEnabled = notifications.tours.isEnabled();

  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(
    () => storage.get(PRODUCT_TOUR_BANNER_STORAGE_KEY) === true
  );
  const [currentStep, setCurrentStep] = useState(0);

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
    storage.set(PRODUCT_TOUR_BANNER_STORAGE_KEY, true);
  }, [storage]);

  const startTour = useCallback(() => {
    dismissBanner();
    setCurrentStep(1);
  }, [dismissBanner]);

  const nextStep = useCallback(
    () => setCurrentStep((step) => (step >= PRODUCT_TOUR_STEPS.length ? 0 : step + 1)),
    []
  );

  const endTour = useCallback(() => setCurrentStep(0), []);

  return useMemo(
    () => ({
      isBannerVisible: isTourEnabled && !isBannerDismissed,
      currentStep,
      startTour,
      nextStep,
      endTour,
      dismissBanner,
    }),
    [isTourEnabled, isBannerDismissed, currentStep, startTour, nextStep, endTour, dismissBanner]
  );
};
