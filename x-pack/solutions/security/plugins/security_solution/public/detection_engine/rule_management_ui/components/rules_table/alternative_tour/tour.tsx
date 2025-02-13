/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiTourStep } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import React, { useCallback, useEffect, useState } from 'react';
import { siemGuideId } from '../../../../../../common/guided_onboarding/siem_guide_config';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import * as i18n from './translations';

export interface Props {
  children: React.ReactElement;
}

export const RulesPageTourComponent: React.FC<Props> = ({ children }) => {
  const tourConfig = {
    currentTourStep: 1,
    isTourActive: true,
    tourPopoverWidth: 300,
  };

  const { storage, guidedOnboarding } = useKibana().services;

  const isGuidedOnboardingActive = useObservable(
    guidedOnboarding?.guidedOnboardingApi?.isGuideStepActive$(siemGuideId, 'rules') ?? of(false),
    true
  );

  const [tourState, setTourState] = useState(() => {
    const restoredTourState = storage.get(NEW_FEATURES_TOUR_STORAGE_KEYS.RULE_MANAGEMENT_PAGE);

    if (restoredTourState != null) {
      return restoredTourState;
    }
    return tourConfig;
  });

  const demoTourSteps = [
    {
      step: 1,
      title: i18n.CREATE_RULE_TOUR_TITLE,
      content: <EuiText>{i18n.CREATE_RULE_TOUR_CONTENT}</EuiText>,
    },
  ];
  const finishTour = useCallback(() => {
    setTourState({
      ...tourState,
      isTourActive: false,
    });
  }, [tourState]);

  useEffect(() => {
    storage.set(NEW_FEATURES_TOUR_STORAGE_KEYS.RULE_MANAGEMENT_PAGE, tourState);
  }, [tourState, storage]);

  return (
    <EuiTourStep
      content={demoTourSteps[0].content}
      isStepOpen={
        tourState.currentTourStep === 1 && tourState.isTourActive && !isGuidedOnboardingActive
      }
      minWidth={tourState.tourPopoverWidth}
      onFinish={finishTour}
      step={1}
      stepsTotal={demoTourSteps.length}
      subtitle={tourState.tourSubtitle}
      title={demoTourSteps[0].title}
      anchorPosition="rightUp"
    >
      {children}
    </EuiTourStep>
  );
};
