/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiTourStep } from '@elastic/eui';
import type { ApplicationStart } from '@kbn/core/public';
import {
  ALERTING_NAV_TOUR_TEST_ID_PREFIX,
  ANCHOR_TIMEOUT_MS,
  TOUR_POPOVER_WIDTH,
} from './constants';
import type { AlertingNavTourStep } from './tour_steps';
import { useIsAnchorMounted } from './use_is_anchor_mounted';
import * as i18n from './translations';

export interface AlertingNavGuidedTourProps {
  steps: AlertingNavTourStep[];
  isActive: boolean;
  onFinish: () => void;
  application: ApplicationStart;
}

/**
 * Multi-step tour over Alerting side-nav items and in-page controls. Navigates
 * between Alerting pages as steps advance; optional onEnter/onLeave run per step.
 */
export const AlertingNavGuidedTour: React.FC<AlertingNavGuidedTourProps> = ({
  steps,
  isActive,
  onFinish,
  application,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const previousStepRef = useRef<AlertingNavTourStep | undefined>(undefined);

  useEffect(() => {
    if (isActive) {
      setCurrentStep(1);
      previousStepRef.current = undefined;
    }
  }, [isActive]);

  const stepsTotal = steps.length;
  const currentStepConfig = steps[currentStep - 1];
  const isCurrentAnchorMounted = useIsAnchorMounted(currentStepConfig?.anchor ?? 'body');

  // Navigate before showing each step so the target page (and anchors) exist.
  useEffect(() => {
    if (!isActive || !currentStepConfig?.appId) {
      return;
    }
    void application.navigateToApp(currentStepConfig.appId, {
      path: currentStepConfig.path,
      deepLinkId: currentStepConfig.deepLinkId,
    });
  }, [isActive, currentStepConfig, application]);

  // Run leave/enter hooks when the active step changes. Retry onEnter briefly so
  // page-mounted anchors are available before step actions run.
  useEffect(() => {
    if (!isActive || !currentStepConfig) {
      return;
    }
    const previous = previousStepRef.current;
    if (previous && previous.stepId !== currentStepConfig.stepId) {
      previous.onLeave?.();
    }
    previousStepRef.current = currentStepConfig;

    if (!currentStepConfig.onEnter) {
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;
    const tryEnter = () => {
      currentStepConfig.onEnter?.();
      attempts += 1;
      if (document.querySelector(currentStepConfig.anchor) || attempts >= maxAttempts) {
        clearInterval(intervalId);
      }
    };
    tryEnter();
    const intervalId = setInterval(tryEnter, 200);
    return () => clearInterval(intervalId);
  }, [isActive, currentStepConfig]);

  const finishTour = useCallback(() => {
    previousStepRef.current?.onLeave?.();
    previousStepRef.current = undefined;
    onFinish();
  }, [onFinish]);

  const nextStep = useCallback(() => setCurrentStep((prev) => prev + 1), []);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    if (!currentStepConfig) {
      finishTour();
      return;
    }
    if (isCurrentAnchorMounted) {
      return;
    }
    const timer = setTimeout(() => setCurrentStep((prev) => prev + 1), ANCHOR_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isActive, currentStepConfig, isCurrentAnchorMounted, finishTour]);

  useEffect(() => {
    if (!isActive || !currentStepConfig || !isCurrentAnchorMounted) {
      return;
    }
    const anchorEl = document.querySelector(currentStepConfig.anchor);
    if (anchorEl && typeof anchorEl.scrollIntoView === 'function') {
      anchorEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }, [isActive, currentStepConfig, isCurrentAnchorMounted]);

  if (!isActive || !currentStepConfig || !isCurrentAnchorMounted) {
    return null;
  }

  const isLastStep = currentStep === stepsTotal;

  return (
    <EuiTourStep
      key={currentStepConfig.stepId}
      anchor={currentStepConfig.anchor}
      anchorPosition={currentStepConfig.anchorPosition}
      content={currentStepConfig.content}
      title={currentStepConfig.title}
      step={currentStep}
      stepsTotal={stepsTotal}
      isStepOpen
      repositionOnScroll
      minWidth={TOUR_POPOVER_WIDTH}
      maxWidth={TOUR_POPOVER_WIDTH}
      onFinish={finishTour}
      data-test-subj={`${ALERTING_NAV_TOUR_TEST_ID_PREFIX}-${currentStepConfig.stepId}`}
      footerAction={
        isLastStep ? (
          <EuiButton
            color="success"
            size="s"
            onClick={finishTour}
            data-test-subj={`${ALERTING_NAV_TOUR_TEST_ID_PREFIX}-finish`}
          >
            {i18n.TOUR_FINISH}
          </EuiButton>
        ) : (
          [
            <EuiButtonEmpty
              key="skip"
              size="s"
              color="text"
              onClick={finishTour}
              data-test-subj={`${ALERTING_NAV_TOUR_TEST_ID_PREFIX}-skip`}
            >
              {i18n.TOUR_SKIP}
            </EuiButtonEmpty>,
            <EuiButton
              key="next"
              color="success"
              size="s"
              onClick={nextStep}
              data-test-subj={`${ALERTING_NAV_TOUR_TEST_ID_PREFIX}-next`}
            >
              {i18n.TOUR_NEXT}
            </EuiButton>,
          ]
        )
      }
    />
  );
};
