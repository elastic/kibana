/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  ReactNode,
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
} from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTourStep,
  EuiTourStepProps,
  EuiImage,
  EuiSpacer,
  EuiText,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import { ApplicationStart } from '@kbn/core/public';
import { observabilityAppId } from '../../../common';
import { tourStepsConfig } from './steps_config';

const minWidth: EuiTourStepProps['minWidth'] = 360;
const maxWidth: EuiTourStepProps['maxWidth'] = 360;
const offset: EuiTourStepProps['offset'] = 30;
const repositionOnScroll: EuiTourStepProps['repositionOnScroll'] = true;

const overviewPath = '/overview';
const dataAssistantStep = 6;

export const observTourStepStorageKey = 'guidedOnboarding.observability.tourStep';

const getSteps = ({
  activeStep,
  incrementStep,
  endTour,
  prependBasePath,
}: {
  activeStep: number;
  incrementStep: () => void;
  endTour: () => void;
  prependBasePath?: (imageName: string) => string;
}) => {
  const footerAction = (
    <EuiFlexGroup gutterSize="s" alignItems="baseline">
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={() => endTour()}
          size="xs"
          color="text"
          // Used for testing and to track FS usage
          data-test-subj="onboarding--observTourSkipButton"
        >
          {i18n.translate('xpack.observabilityShared.tour.skipButtonLabel', {
            defaultMessage: 'Skip tour',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton
          onClick={() => incrementStep()}
          size="s"
          color="success"
          // Used for testing and to track FS usage
          data-test-subj="onboarding--observTourNextStepButton"
        >
          {i18n.translate('xpack.observabilityShared.tour.nextButtonLabel', {
            defaultMessage: 'Next',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const lastStepFooterAction = (
    // data-test-subj is used for testing and to track FS usage
    <EuiButtonEmpty
      size="xs"
      color="text"
      onClick={() => endTour()}
      data-test-subj="onboarding--observTourEndButton"
    >
      {i18n.translate('xpack.observabilityShared.tour.endButtonLabel', {
        defaultMessage: 'End tour',
      })}
    </EuiButtonEmpty>
  );

  return tourStepsConfig.map((stepConfig, index) => {
    const step = index + 1;
    const { dataTestSubj, content, offset: stepOffset, imageConfig, ...tourStepProps } = stepConfig;
    // console.log('stepConfig:', stepConfig);
    return (
      <EuiTourStep
        {...tourStepProps}
        key={step}
        step={step}
        minWidth={minWidth}
        maxWidth={maxWidth}
        offset={stepOffset ?? offset}
        repositionOnScroll={repositionOnScroll}
        stepsTotal={tourStepsConfig.length}
        isStepOpen={step === activeStep}
        footerAction={activeStep === tourStepsConfig.length ? lastStepFooterAction : footerAction}
        panelProps={{
          'data-test-subj': dataTestSubj,
        }}
        onFinish={() => {}} // EUI expects this prop but we handle progression with footerAction
        content={
          <>
            <EuiText size="s">
              <p>{content}</p>
            </EuiText>
            {imageConfig && prependBasePath && (
              <>
                <EuiSpacer size="m" />
                <EuiImage
                  alt={imageConfig.altText}
                  src={prependBasePath(`/plugins/observability/assets/${imageConfig.name}`)}
                  size="fullWidth"
                />
              </>
            )}
          </>
        }
      />
    );
  });
};

export interface ObservabilityTourContextValue {
  endTour: () => void;
  isTourVisible: boolean;
}

const ObservabilityTourContext = createContext<ObservabilityTourContextValue>({
  endTour: () => {},
  isTourVisible: false,
} as ObservabilityTourContextValue);

export function ObservabilityTour({
  children,
  navigateToApp,
  isPageDataLoaded,
  showTour,
  prependBasePath,
}: {
  children: ({ isTourVisible }: { isTourVisible: boolean }) => ReactNode;
  navigateToApp: ApplicationStart['navigateToApp'];
  isPageDataLoaded: boolean;
  showTour: boolean;
  prependBasePath?: (imageName: string) => string;
}) {
  const prevActiveStep = localStorage.getItem(observTourStepStorageKey);
  const initialActiveStep = prevActiveStep === null ? 1 : Number(prevActiveStep);

  // Initialize tour state - once started, it should be independent of showTour prop changes
  const [isTourActive, setIsTourActive] = useState(() => {
    // Only start tour if showTour is true AND we have a saved step or starting fresh
    return showTour && (prevActiveStep !== null || showTour);
  });
  const [activeStep, setActiveStep] = useState(initialActiveStep);

  const { pathname: currentPath } = useLocation();

  const isSmallBreakpoint = useIsWithinBreakpoints(['s']);

  const isOverviewPage = currentPath === overviewPath;

  const incrementStep = useCallback(() => {
    // console.log('incrementStep called');
    setActiveStep((prevState) => {
      // console.log('Current step:', prevState, 'Next step:', prevState + 1);
      return prevState + 1;
    });
  }, []);

  const endTour = useCallback(() => {
    // Reset EuiTour step state
    setActiveStep(1);
    setIsTourActive(false);
    localStorage.removeItem(observTourStepStorageKey);
  }, []);

  /**
   * The tour should only be visible if the following conditions are met:
   * - Only pages with the side nav should show the tour (showTour === true)
   * - Tour is set to active per the guided onboarding service (isTourActive === true)
   * - Any page data must be loaded in order for the tour to render correctly
   * - The tour should only render on medium-large screens
   */
  const isTourVisible = showTour && isTourActive && isPageDataLoaded && isSmallBreakpoint === false;

  const context: ObservabilityTourContextValue = { endTour, isTourVisible };

  useEffect(() => {
    localStorage.setItem(observTourStepStorageKey, String(activeStep));
  }, [activeStep]);

  useEffect(() => {
    // Set tour active when showTour prop changes
    setIsTourActive(showTour);
  }, [showTour]);

  useEffect(() => {
    // End tour when all steps are completed
    if (activeStep > tourStepsConfig.length && isTourActive) {
      setIsTourActive(false);
      setActiveStep(1);
      localStorage.removeItem(observTourStepStorageKey);
    }
  }, [activeStep, isTourActive]);

  useEffect(() => {
    // The user must be on the overview page to view the data assistant step in the tour
    if (isTourActive && isOverviewPage === false && activeStep === dataAssistantStep) {
      navigateToApp(observabilityAppId, {
        path: overviewPath,
      });
    }
  }, [activeStep, isOverviewPage, isTourActive, navigateToApp]);

  return (
    <ObservabilityTourContext.Provider value={context}>
      <>
        {children({ isTourVisible })}
        {isTourVisible && getSteps({ activeStep, incrementStep, endTour, prependBasePath })}
      </>
    </ObservabilityTourContext.Provider>
  );
}

export const useObservabilityTourContext = (): ObservabilityTourContextValue => {
  const ctx = useContext(ObservabilityTourContext);
  if (!ctx) {
    throw new Error('useObservabilityTourContext can only be called inside of TourContext');
  }
  return ctx;
};
