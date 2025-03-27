/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiTourStep } from '@elastic/eui';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import * as i18n from './translations';

const tourConfig = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 360,
};

export interface SetupTourProps {
  children: React.ReactElement;
}

export const SiemMigrationSetupTour: React.FC<SetupTourProps> = React.memo(({ children }) => {
  const { siemMigrations, storage } = useKibana().services;

  const [tourState, setTourState] = useState(() => {
    const restoredTourState = storage.get(NEW_FEATURES_TOUR_STORAGE_KEYS.SIEM_MAIN_LANDING_PAGE);
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

  useEffect(() => {
    storage.set(NEW_FEATURES_TOUR_STORAGE_KEYS.SIEM_MAIN_LANDING_PAGE, tourState);
  }, [tourState, storage]);

  const [tourDelayElapsed, setTourDelayElapsed] = useState(false);

  useEffect(() => {
    // visible EuiTourStep anchors don't follow the button when the layout changes
    const timeout = setTimeout(() => setTourDelayElapsed(true), 1000);
    return () => clearTimeout(timeout);
  }, []);

  const showTour = useMemo(() => {
    return siemMigrations.rules.isAvailable() && tourState.isTourActive && tourDelayElapsed;
  }, [siemMigrations.rules, tourDelayElapsed, tourState.isTourActive]);

  return (
    <EuiTourStep
      anchorPosition="downCenter"
      content={i18n.SETUP_SIEM_MIGRATION_TOUR_CONTENT}
      isStepOpen={showTour}
      maxWidth={tourState.tourPopoverWidth}
      zIndex={1}
      onFinish={onTourFinished}
      step={1}
      stepsTotal={1}
      subtitle={i18n.SETUP_SIEM_MIGRATION_TOUR_SUBTITLE}
      title={i18n.SETUP_SIEM_MIGRATION_TOUR_TITLE}
      footerAction={
        <EuiButtonEmpty size="xs" color="text" flush="right" onClick={onTourFinished}>
          {i18n.FINISH_TOUR_BUTTON}
        </EuiButtonEmpty>
      }
    >
      {children}
    </EuiTourStep>
  );
});
SiemMigrationSetupTour.displayName = 'SiemMigrationSetupTour';
