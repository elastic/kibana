/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { serviceNameFromPath, uxAppPath } from '../../../utils/ux_app_path';
import {
  firstAppNameFromDom,
  suffixForUxTab,
  UX_PRODUCT_TOUR_STEPS,
  UX_PRODUCT_TOUR_STORAGE_KEY,
  type UxTourStep,
} from './tour_steps';

const TOUR_HELP = i18n.translate('xpack.ux.tour.helpButtonTooltip', {
  defaultMessage: 'Take a tour',
});

export type UxTourInventoryStatus = 'unknown' | 'loading' | 'empty' | 'ready';

export interface UxTourContextValue {
  isActive: boolean;
  toursEnabled: boolean;
  currentStep: number;
  stepsTotal: number;
  stepConfig: UxTourStep | undefined;
  finishTour: () => void;
  nextStep: () => void;
  startTour: () => void;
  setInventoryStatus: (status: UxTourInventoryStatus) => void;
}

const UxTourContext = createContext<UxTourContextValue | null>(null);

export function useUxTour(): UxTourContextValue | null {
  return useContext(UxTourContext);
}

export function UxTourProvider({ children }: { children: React.ReactNode }) {
  const history = useHistory();
  const location = useLocation();
  const { notifications } = useKibanaServices();
  const toursEnabled = notifications.tours?.isEnabled() ?? true;
  const [hasSeenTour, setHasSeenTour] = useLocalStorage(UX_PRODUCT_TOUR_STORAGE_KEY, false);
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [inventoryStatus, setInventoryStatus] = useState<UxTourInventoryStatus>('unknown');

  const stepsTotal = UX_PRODUCT_TOUR_STEPS.length;
  const stepConfig = UX_PRODUCT_TOUR_STEPS[currentStep - 1];

  const finishTour = useCallback(() => {
    setIsActive(false);
    setHasSeenTour(true);
  }, [setHasSeenTour]);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(1);
    setIsActive(true);
  }, []);

  useEffect(() => {
    if (toursEnabled && hasSeenTour === false) {
      setIsActive(true);
    }
  }, [toursEnabled, hasSeenTour]);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    if (!stepConfig) {
      finishTour();
    }
  }, [finishTour, isActive, stepConfig]);

  useEffect(() => {
    if (!isActive || !stepConfig) {
      return;
    }
    if (stepConfig.location === 'inventory') {
      if (stepConfig.optional && inventoryStatus === 'empty') {
        nextStep();
        return;
      }
      if (location.pathname !== '/') {
        history.push({ pathname: '/', search: location.search });
      }
      return;
    }
    const serviceName = serviceNameFromPath(location.pathname) ?? firstAppNameFromDom();
    if (!serviceName) {
      if (inventoryStatus === 'empty') {
        finishTour();
      }
      return;
    }
    const pathname = uxAppPath(serviceName, suffixForUxTab(stepConfig.location));
    if (location.pathname !== pathname) {
      history.push({ pathname, search: location.search });
    }
  }, [
    finishTour,
    history,
    inventoryStatus,
    isActive,
    location.pathname,
    location.search,
    nextStep,
    stepConfig,
  ]);

  const value = useMemo<UxTourContextValue>(
    () => ({
      isActive,
      toursEnabled,
      currentStep,
      stepsTotal,
      stepConfig,
      finishTour,
      nextStep,
      startTour,
      setInventoryStatus,
    }),
    [currentStep, finishTour, isActive, nextStep, startTour, stepConfig, stepsTotal, toursEnabled]
  );

  return <UxTourContext.Provider value={value}>{children}</UxTourContext.Provider>;
}

export function UxTourInventoryState({ status }: { status: UxTourInventoryStatus }) {
  const tour = useUxTour();
  useEffect(() => {
    tour?.setInventoryStatus(status);
  }, [status, tour]);
  return null;
}

export function UxProductTour() {
  const tour = useUxTour();
  if (!tour?.toursEnabled) {
    return null;
  }

  return (
    <EuiToolTip content={TOUR_HELP} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="help"
        color="text"
        display="base"
        size="s"
        aria-label={TOUR_HELP}
        data-test-subj="uxProductTourHelpButton"
        onClick={tour.startTour}
      />
    </EuiToolTip>
  );
}
