/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import useObservable from 'react-use/lib/useObservable';
import { catchError, of, timeout } from 'rxjs';
import { useLocation } from 'react-router-dom';
import { siemGuideId } from '../../../../common/guided_onboarding/siem_guide_config';
import { isTourPath } from '../../../helpers';
import { useKibana } from '../../lib/kibana';
import type { AlertsCasesTourSteps } from './tour_config';
import { securityTourConfig, SecurityStepId } from './tour_config';

export interface TourContextValue {
  activeStep: number;
  endTourStep: (tourId: SecurityStepId) => void;
  incrementStep: (tourId: SecurityStepId) => void;
  isTourShown: (tourId: SecurityStepId) => boolean;
  setStep: (tourId: SecurityStepId, step: AlertsCasesTourSteps) => void;
  hidden: boolean;
  setAllTourStepsHidden: (h: boolean) => void;
}

const initialState: TourContextValue = {
  activeStep: 0,
  endTourStep: () => {},
  incrementStep: () => {},
  isTourShown: () => false,
  setStep: () => {},
  hidden: false,
  setAllTourStepsHidden: () => {},
};

const TourContext = createContext<TourContextValue>(initialState);

export const RealTourContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { guidedOnboarding } = useKibana().services;
  const [hidden, setHidden] = useState(false);

  const setAllTourStepsHidden = useCallback((h: boolean) => {
    setHidden(h);
  }, []);

  const isRulesTourActive = useObservable(
    guidedOnboarding?.guidedOnboardingApi
      ?.isGuideStepActive$(siemGuideId, SecurityStepId.rules)
      .pipe(
        // if no result after 30s the observable will error, but the error handler will just emit false
        timeout(30000),
        catchError((error) => of(false))
      ) ?? of(false),
    false
  );
  const isAlertsCasesTourActive = useObservable(
    guidedOnboarding?.guidedOnboardingApi
      ?.isGuideStepActive$(siemGuideId, SecurityStepId.alertsCases)
      .pipe(
        // if no result after 30s the observable will error, but the error handler will just emit false
        timeout(30000),
        catchError((error) => of(false))
      ) ?? of(false),
    false
  );

  const tourStatus = useMemo(
    () => ({
      [SecurityStepId.rules]: { active: isRulesTourActive, hidden: false },
      [SecurityStepId.alertsCases]: { active: isAlertsCasesTourActive, hidden: false },
    }),
    [isRulesTourActive, isAlertsCasesTourActive]
  );

  const isTourShown = useCallback(
    (tourId: SecurityStepId) => tourStatus[tourId].active,
    [tourStatus]
  );
  const [activeStep, _setActiveStep] = useState<number>(1);

  const incrementStep = useCallback((tourId: SecurityStepId) => {
    _setActiveStep(
      (prevState) => (prevState >= securityTourConfig[tourId].length ? 0 : prevState) + 1
    );
  }, []);

  const setStep = useCallback((tourId: SecurityStepId, step: number) => {
    if (step <= securityTourConfig[tourId].length) _setActiveStep(step);
  }, []);

  const [completeStep, setCompleteStep] = useState<null | SecurityStepId>(null);

  useEffect(() => {
    if (!completeStep || !guidedOnboarding?.guidedOnboardingApi) {
      return;
    }
    let ignore = false;
    const complete = async () => {
      await guidedOnboarding?.guidedOnboardingApi?.completeGuideStep(siemGuideId, completeStep);
      if (!ignore) {
        setCompleteStep(null);
        _setActiveStep(1);
      }
    };
    complete();
    return () => {
      ignore = true;
    };
  }, [completeStep, guidedOnboarding]);

  const endTourStep = useCallback((tourId: SecurityStepId) => {
    setCompleteStep(tourId);
  }, []);

  const context = useMemo(() => {
    return {
      hidden,
      setAllTourStepsHidden,
      activeStep,
      endTourStep,
      incrementStep,
      isTourShown,
      setStep,
    };
  }, [activeStep, endTourStep, hidden, incrementStep, isTourShown, setAllTourStepsHidden, setStep]);

  return <TourContext.Provider value={context}>{children}</TourContext.Provider>;
};

export const TourContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();

  const ContextProvider = useMemo(
    () => (isTourPath(pathname) ? RealTourContextProvider : TourContext.Provider),
    [pathname]
  );

  return <ContextProvider value={initialState}>{children}</ContextProvider>;
};

export const useTourContext = (): TourContextValue => {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTourContext can only be called inside of TourContext!');
  }
  return ctx;
};
