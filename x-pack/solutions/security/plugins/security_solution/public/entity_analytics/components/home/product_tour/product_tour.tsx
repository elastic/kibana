/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiButton, EuiButtonEmpty, EuiText, EuiTourStep } from '@elastic/eui';
import { useIsAnchorMounted } from '../../../../detections/components/attacks/tour/use_is_anchor_mounted';
import {
  ANCHOR_TIMEOUT_MS,
  PRODUCT_TOUR_CLOSE_TEST_ID,
  PRODUCT_TOUR_FINISH_TEST_ID,
  PRODUCT_TOUR_NEXT_TEST_ID,
  TOUR_POPOVER_WIDTH,
  getProductTourStepTestId,
  type ProductTourStepConfig,
} from './constants';
import { STEP_CLOSE_TOUR, STEP_FINISH_TOUR, STEP_NEXT } from './translations';

export interface ProductTourProps {
  steps: readonly ProductTourStepConfig[];
  /** 1-based; 0 when the tour is not running. */
  currentStep: number;
  onNext: () => void;
  onEnd: () => void;
}

interface ProductTourStepProps {
  step: ProductTourStepConfig;
  stepNumber: number;
  stepsTotal: number;
  onNext: () => void;
  onEnd: () => void;
}

const ProductTourStep: React.FC<ProductTourStepProps> = ({
  step,
  stepNumber,
  stepsTotal,
  onNext,
  onEnd,
}) => {
  const isAnchorMounted = useIsAnchorMounted(step.anchor);

  useEffect(() => {
    if (isAnchorMounted) return;
    const timer = setTimeout(onNext, ANCHOR_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isAnchorMounted, onNext]);

  useEffect(() => {
    if (!isAnchorMounted) return;
    document.querySelector(step.anchor)?.scrollIntoView({ block: 'nearest' });
  }, [isAnchorMounted, step.anchor]);

  // EuiTourStep resolves its anchor once on mount, so wait for the element.
  if (!isAnchorMounted) return null;

  const isLastStep = stepNumber === stepsTotal;

  return (
    <EuiTourStep
      anchor={step.anchor}
      anchorPosition={step.anchorPosition}
      repositionOnScroll
      title={step.title}
      content={
        <EuiText size="s">
          <p>{step.content}</p>
        </EuiText>
      }
      step={stepNumber}
      stepsTotal={stepsTotal}
      isStepOpen
      minWidth={TOUR_POPOVER_WIDTH}
      maxWidth={TOUR_POPOVER_WIDTH}
      onFinish={onEnd}
      data-test-subj={getProductTourStepTestId(step.id)}
      footerAction={
        isLastStep ? (
          <EuiButton
            color="success"
            size="s"
            onClick={onEnd}
            data-test-subj={PRODUCT_TOUR_FINISH_TEST_ID}
          >
            {STEP_FINISH_TOUR}
          </EuiButton>
        ) : (
          [
            <EuiButtonEmpty
              key="close"
              size="s"
              color="text"
              onClick={onEnd}
              data-test-subj={PRODUCT_TOUR_CLOSE_TEST_ID}
            >
              {STEP_CLOSE_TOUR}
            </EuiButtonEmpty>,
            <EuiButton
              key="next"
              color="success"
              size="s"
              onClick={onNext}
              data-test-subj={PRODUCT_TOUR_NEXT_TEST_ID}
            >
              {STEP_NEXT}
            </EuiButton>,
          ]
        )
      }
    />
  );
};

/** Step-by-step tour of the Entity Analytics page controls. */
export const ProductTour: React.FC<ProductTourProps> = ({ steps, currentStep, onNext, onEnd }) => {
  const step = steps[currentStep - 1];
  if (!step) return null;

  // Remount per step: EuiWrappingPopover moves the anchor into the popover and only puts it back on unmount.
  return (
    <ProductTourStep
      key={step.id}
      step={step}
      stepNumber={currentStep}
      stepsTotal={steps.length}
      onNext={onNext}
      onEnd={onEnd}
    />
  );
};
