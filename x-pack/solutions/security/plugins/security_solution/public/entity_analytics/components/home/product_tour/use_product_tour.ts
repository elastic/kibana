/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import { useHuntWithAiAvailability } from '../use_hunt_with_ai_availability';
import {
  HUNT_WITH_AI_STEP_ID,
  PRODUCT_TOUR_BANNER_STORAGE_KEY,
  PRODUCT_TOUR_STEPS,
  type ProductTourStepConfig,
} from './constants';

export interface ProductTourState {
  isBannerVisible: boolean;
  /** Steps whose target renders on the page. */
  steps: readonly ProductTourStepConfig[];
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

  const isHuntWithAiAvailable = useHuntWithAiAvailability();
  const steps = useMemo(
    () =>
      PRODUCT_TOUR_STEPS.filter(({ id }) => id !== HUNT_WITH_AI_STEP_ID || isHuntWithAiAvailable),
    [isHuntWithAiAvailable]
  );

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
    storage.set(PRODUCT_TOUR_BANNER_STORAGE_KEY, true);
  }, [storage]);

  const startTour = useCallback(() => {
    dismissBanner();
    setCurrentStep(1);
  }, [dismissBanner]);

  const nextStep = useCallback(
    () => setCurrentStep((step) => (step >= steps.length ? 0 : step + 1)),
    [steps.length]
  );

  const endTour = useCallback(() => setCurrentStep(0), []);

  return useMemo(
    () => ({
      isBannerVisible: isTourEnabled && !isBannerDismissed,
      steps,
      currentStep,
      startTour,
      nextStep,
      endTour,
      dismissBanner,
    }),
    [
      isTourEnabled,
      isBannerDismissed,
      steps,
      currentStep,
      startTour,
      nextStep,
      endTour,
      dismissBanner,
    ]
  );
};
