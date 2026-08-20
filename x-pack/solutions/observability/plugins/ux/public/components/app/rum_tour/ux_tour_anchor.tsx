/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { EuiButton, EuiButtonEmpty, EuiText, EuiTourStep } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUxTour } from './ux_tour_context';

const POPOVER_WIDTH = 360;

const TOUR_SKIP = i18n.translate('xpack.ux.tour.skipButtonLabel', {
  defaultMessage: 'Skip tour',
});
const TOUR_NEXT = i18n.translate('xpack.ux.tour.nextButtonLabel', {
  defaultMessage: 'Next',
});
const TOUR_FINISH = i18n.translate('xpack.ux.tour.finishButtonLabel', {
  defaultMessage: 'Done',
});

export function UxTourAnchor({
  stepId,
  display = 'inline-block',
  children,
}: {
  stepId: string;
  display?: 'inline-block' | 'block';
  children: React.ReactNode;
}) {
  const tour = useUxTour();
  const stepConfig = tour?.stepConfig;
  const isOpen = Boolean(tour?.isActive && tour.toursEnabled && stepConfig?.stepId === stepId);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    anchorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [isOpen]);

  if (!isOpen || !tour || !stepConfig) {
    return <>{children}</>;
  }

  const isLastStep = tour.currentStep === tour.stepsTotal;

  return (
    <EuiTourStep
      key={stepId}
      isStepOpen
      decoration="beacon"
      repositionOnScroll
      minWidth={POPOVER_WIDTH}
      maxWidth={POPOVER_WIDTH}
      anchorPosition={stepConfig.anchorPosition}
      title={stepConfig.title}
      step={tour.currentStep}
      stepsTotal={tour.stepsTotal}
      onFinish={tour.finishTour}
      data-test-subj={`uxProductTour-${stepId}`}
      content={
        <EuiText size="s">
          <p>{stepConfig.content}</p>
        </EuiText>
      }
      footerAction={
        isLastStep ? (
          <EuiButton
            color="success"
            size="s"
            onClick={tour.finishTour}
            data-test-subj="uxProductTourFinish"
          >
            {TOUR_FINISH}
          </EuiButton>
        ) : (
          [
            <EuiButtonEmpty
              key="skip"
              size="s"
              color="text"
              onClick={tour.finishTour}
              data-test-subj="uxProductTourSkip"
            >
              {TOUR_SKIP}
            </EuiButtonEmpty>,
            <EuiButton
              key="next"
              color="success"
              size="s"
              onClick={tour.nextStep}
              data-test-subj="uxProductTourNext"
            >
              {TOUR_NEXT}
            </EuiButton>,
          ]
        )
      }
    >
      <div ref={anchorRef} data-test-subj={`uxTourAnchor-${stepId}`} style={{ display }}>
        {children}
      </div>
    </EuiTourStep>
  );
}
