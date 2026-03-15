/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EuiTourStep, EuiText, EuiButtonEmpty, EuiButton } from '@elastic/eui';

const TOUR_STORAGE_KEY = 'ingestHub:showDiscoverTour';
const TOUR_EVENT = 'ingestHub:startDiscoverTour';

interface TourStepConfig {
  title: string;
  content: React.ReactNode;
  anchor: string;
  anchorPosition:
    | 'downCenter'
    | 'downLeft'
    | 'downRight'
    | 'upCenter'
    | 'upLeft'
    | 'upRight'
    | 'leftCenter'
    | 'leftUp'
    | 'leftDown'
    | 'rightCenter'
    | 'rightUp'
    | 'rightDown';
}

const TOUR_STEPS: TourStepConfig[] = [
  {
    title: 'Your data is live!',
    content: (
      <EuiText size="s">
        <p>
          Your AWS logs are now streaming into this data view. You can switch between data views to
          explore different datasets.
        </p>
      </EuiText>
    ),
    anchor: '[data-test-subj*="dataView-switch-link"]',
    anchorPosition: 'downLeft',
  },
  {
    title: 'Explore your fields',
    content: (
      <EuiText size="s">
        <p>
          Browse available fields from your log sources. Click any field to see its top values or
          add it as a column to the table.
        </p>
      </EuiText>
    ),
    anchor: '[data-test-subj="fieldListGroupedAvailableFields"]',
    anchorPosition: 'rightUp',
  },
  {
    title: 'Browse your log events',
    content: (
      <EuiText size="s">
        <p>
          Your AWS log events appear here. Expand any row to see its full details, or add columns
          from the sidebar to customize your view.
        </p>
      </EuiText>
    ),
    anchor: '[data-test-subj="dscViewModeDocumentButton"]',
    anchorPosition: 'downCenter',
  },
  {
    title: 'Add more data anytime',
    content: (
      <EuiText size="s">
        <p>
          Head back to <strong>Ingest Hub</strong> whenever you want to add more data sources, set
          up metrics collection, or explore your existing integrations.
        </p>
      </EuiText>
    ),
    anchor: '[data-test-subj*="deepLinkId-observabilityOnboarding:ingest-hub"]',
    anchorPosition: 'rightCenter',
  },
];

const SingleTourStep: React.FC<{
  step: TourStepConfig;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onClose: () => void;
  isLast: boolean;
}> = ({ step, stepNumber, totalSteps, onNext, onClose, isLast }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(step.anchor);
    setAnchorEl(el);
  }, [step.anchor]);

  if (!anchorEl) return null;

  return (
    <EuiTourStep
      anchor={anchorEl}
      isStepOpen
      title={step.title}
      content={step.content}
      step={stepNumber}
      stepsTotal={totalSteps}
      onFinish={onClose}
      anchorPosition={step.anchorPosition}
      maxWidth={340}
      footerAction={
        !isLast
          ? [
              <EuiButtonEmpty size="s" color="text" onClick={onClose} flush="left">
                Skip tour
              </EuiButtonEmpty>,
              <EuiButton size="s" color="success" fill onClick={onNext}>
                Next
              </EuiButton>,
            ]
          : [
              <EuiButtonEmpty size="s" color="text" onClick={onClose} flush="left">
                Close tour
              </EuiButtonEmpty>,
              <EuiButton size="s" color="success" fill onClick={onClose}>
                Done
              </EuiButton>,
            ]
      }
    >
      <span />
    </EuiTourStep>
  );
};

export const DiscoverTour: React.FC<{
  navigateToApp?: (appId: string, options?: { path?: string }) => Promise<void>;
}> = ({ navigateToApp }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    clearPolling();
    let attempts = 0;
    intervalRef.current = setInterval(() => {
      attempts++;
      const firstAnchor = document.querySelector(TOUR_STEPS[0].anchor);
      if (firstAnchor) {
        clearPolling();
        sessionStorage.removeItem(TOUR_STORAGE_KEY);
        setCurrentStep(0);
        setIsActive(true);
      } else if (attempts > 40) {
        clearPolling();
        sessionStorage.removeItem(TOUR_STORAGE_KEY);
      }
    }, 300);
  }, [clearPolling]);

  useEffect(() => {
    if (sessionStorage.getItem(TOUR_STORAGE_KEY) === 'true') {
      startPolling();
    }

    const handler = () => startPolling();
    window.addEventListener(TOUR_EVENT, handler);
    return () => {
      window.removeEventListener(TOUR_EVENT, handler);
      clearPolling();
    };
  }, [startPolling, clearPolling]);

  const closeTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
  }, []);

  const goToNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      closeTour();
    }
  }, [currentStep, closeTour]);

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  if (!step) return null;

  return (
    <SingleTourStep
      key={currentStep}
      step={step}
      stepNumber={currentStep + 1}
      totalSteps={TOUR_STEPS.length}
      onNext={goToNext}
      onClose={closeTour}
      isLast={currentStep === TOUR_STEPS.length - 1}
    />
  );
};
