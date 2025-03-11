/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiTourStep } from '@elastic/eui';
import { noop } from 'lodash';
import { useIsElementMounted } from '../../../../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/use_is_element_mounted';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { TourSteps, tourConfig, tourSteps } from './step_config';
import * as i18n from './translations';

export const SiemTranslatedRulesTour: React.FC = React.memo(() => {
  const { siemMigrations, storage } = useKibana().services;

  const stepsCount = Object.keys(tourSteps).length;
  const selectMigrationStepData = tourSteps[TourSteps.MIGRATION_SELECTION];
  const statusHeaderStepData = tourSteps[TourSteps.MIGRATION_RULE_STATUS];
  const getStartedStepData = tourSteps[TourSteps.MIGRATION_ONBOARDING_HUB];

  const isSelectMigrationAnchorMounted = useIsElementMounted(selectMigrationStepData.anchorId);
  const isStatusHeaderAnchorMounted = useIsElementMounted(statusHeaderStepData.anchorId);
  const isGetStartedNavigationAnchorMounted = useIsElementMounted(getStartedStepData.anchorId);

  const [tourState, setTourState] = useState(() => {
    const restoredTourState = storage.get(
      NEW_FEATURES_TOUR_STORAGE_KEYS.SIEM_RULE_TRANSLATION_PAGE
    );
    if (restoredTourState != null) {
      return restoredTourState;
    }
    return tourConfig;
  });

  const onTourFinished = useCallback(() => {
    setTourState({
      ...tourState,
      isTourActive: false,
    });
  }, [tourState]);

  const onTourNext = useCallback(() => {
    setTourState({
      ...tourState,
      currentTourStep: tourState.currentTourStep + 1,
    });
  }, [tourState]);

  useEffect(() => {
    storage.set(NEW_FEATURES_TOUR_STORAGE_KEYS.SIEM_RULE_TRANSLATION_PAGE, tourState);
  }, [tourState, storage]);

  const isTourActive = useMemo(() => {
    return siemMigrations.rules.isAvailable() && tourState.isTourActive;
  }, [siemMigrations.rules, tourState]);

  return (
    <>
      {isSelectMigrationAnchorMounted && (
        <EuiTourStep
          title={selectMigrationStepData.title}
          content={selectMigrationStepData.content}
          onFinish={noop}
          step={selectMigrationStepData.step}
          stepsTotal={stepsCount}
          isStepOpen={isTourActive && tourState.currentTourStep === selectMigrationStepData.step}
          anchor={`#${selectMigrationStepData.anchorId}`}
          anchorPosition={selectMigrationStepData.anchorPosition}
          maxWidth={tourState.tourPopoverWidth}
          footerAction={
            <EuiButtonEmpty size="xs" color="text" flush="right" onClick={onTourNext}>
              {i18n.NEXT_TOUR_STEP_BUTTON}
            </EuiButtonEmpty>
          }
        />
      )}
      {isStatusHeaderAnchorMounted && (
        <EuiTourStep
          title={statusHeaderStepData.title}
          content={statusHeaderStepData.content}
          onFinish={noop}
          step={statusHeaderStepData.step}
          stepsTotal={stepsCount}
          isStepOpen={isTourActive && tourState.currentTourStep === statusHeaderStepData.step}
          anchor={`#${statusHeaderStepData.anchorId}`}
          anchorPosition={statusHeaderStepData.anchorPosition}
          maxWidth={tourState.tourPopoverWidth}
          footerAction={
            <EuiButtonEmpty size="xs" color="text" flush="right" onClick={onTourNext}>
              {i18n.NEXT_TOUR_STEP_BUTTON}
            </EuiButtonEmpty>
          }
        />
      )}
      {isGetStartedNavigationAnchorMounted && (
        <EuiTourStep
          title={getStartedStepData.title}
          content={getStartedStepData.content}
          onFinish={noop}
          step={getStartedStepData.step}
          stepsTotal={stepsCount}
          isStepOpen={isTourActive && tourState.currentTourStep === getStartedStepData.step}
          anchor={`#${getStartedStepData.anchorId}`}
          anchorPosition={getStartedStepData.anchorPosition}
          maxWidth={tourState.tourPopoverWidth}
          footerAction={
            <EuiButtonEmpty size="xs" color="text" flush="right" onClick={onTourFinished}>
              {i18n.FINISH_TOUR_BUTTON}
            </EuiButtonEmpty>
          }
        />
      )}
    </>
  );
});
SiemTranslatedRulesTour.displayName = 'SiemTranslatedRulesTour';
