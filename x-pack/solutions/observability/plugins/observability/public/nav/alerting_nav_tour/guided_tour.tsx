/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiTourStep, useEuiTheme } from '@elastic/eui';
import type { ApplicationStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { AlertingNavTourStep } from './tour_steps';

export const ALERTING_NAV_TOUR_TEST_ID_PREFIX = 'alertingNavTourStep';

/** Wait for Management pages (e.g. Maintenance Windows) before skipping a missing anchor. */
const ANCHOR_TIMEOUT_MS = 8000;
/** Tour popover width as a multiple of `euiTheme.base` (16 → 320px). */
const TOUR_POPOVER_WIDTH_BASE_MULTIPLIER = 20;

const TOUR_NEXT = i18n.translate('xpack.observability.alertingNavTour.next', {
  defaultMessage: 'Next',
});
const TOUR_SKIP = i18n.translate('xpack.observability.alertingNavTour.skip', {
  defaultMessage: 'Skip tour',
});
const TOUR_FINISH = i18n.translate('xpack.observability.alertingNavTour.finish', {
  defaultMessage: 'Finish',
});

const useIsAnchorMounted = (selector: string): boolean => {
  const [isMounted, setIsMounted] = useState(
    () => typeof document !== 'undefined' && !!document.querySelector(selector)
  );

  useEffect(() => {
    const check = () => setIsMounted(!!document.querySelector(selector));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selector]);

  return isMounted;
};

export interface AlertingNavGuidedTourProps {
  steps: AlertingNavTourStep[];
  isActive: boolean;
  onFinish: () => void;
  application: ApplicationStart;
}

/** Multi-step tour over Alerting nav items; navigates between pages as steps advance. */
export const AlertingNavGuidedTour: React.FC<AlertingNavGuidedTourProps> = ({
  steps,
  isActive,
  onFinish,
  application,
}) => {
  const { euiTheme } = useEuiTheme();
  const tourPopoverWidth = euiTheme.base * TOUR_POPOVER_WIDTH_BASE_MULTIPLIER;
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (isActive) {
      setCurrentStep(1);
    }
  }, [isActive]);

  const stepsTotal = steps.length;
  const currentStepConfig = steps[currentStep - 1];
  const isCurrentAnchorMounted = useIsAnchorMounted(currentStepConfig?.anchor ?? 'body');

  useEffect(() => {
    if (!isActive || !currentStepConfig?.appId) {
      return;
    }
    void application.navigateToApp(currentStepConfig.appId, {
      path: currentStepConfig.path,
      deepLinkId: currentStepConfig.deepLinkId,
    });
  }, [isActive, currentStepConfig, application]);

  const finishTour = useCallback(() => {
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
      minWidth={tourPopoverWidth}
      maxWidth={tourPopoverWidth}
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
            {TOUR_FINISH}
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
              {TOUR_SKIP}
            </EuiButtonEmpty>,
            <EuiButton
              key="next"
              color="success"
              size="s"
              onClick={nextStep}
              data-test-subj={`${ALERTING_NAV_TOUR_TEST_ID_PREFIX}-next`}
            >
              {TOUR_NEXT}
            </EuiButton>,
          ]
        )
      }
    />
  );
};

export { ANCHOR_TIMEOUT_MS };
