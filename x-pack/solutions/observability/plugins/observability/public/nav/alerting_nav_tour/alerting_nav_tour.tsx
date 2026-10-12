/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { AlertingNavGuidedTour } from './guided_tour';
import { getAlertingNavTourSteps } from './tour_steps';
import { ALERTING_NAV_START_TOUR_EVENT } from './alerting_nav_tour_state';

export { ALERTING_NAV_START_TOUR_EVENT } from './alerting_nav_tour_state';

/**
 * Guided tour for Unified Alerting navigation.
 * Mounted outside any single app so navigation does not unmount the tour.
 * The floating promo lives on the Alerts route (`AlertingNavPromo`).
 */
export const AlertingNavTour: React.FC<{ coreStart: CoreStart }> = ({ coreStart }) => {
  const isTourEnabled = coreStart.notifications.tours.isEnabled();
  const [isTourActive, setIsTourActive] = useState(false);

  const startTour = useCallback(() => {
    if (!isTourEnabled) {
      return;
    }
    // Side nav expand happens in AlertingNavGuidedTour when the tour becomes active.
    setIsTourActive(true);
  }, [isTourEnabled]);

  const finishTour = useCallback(() => {
    setIsTourActive(false);
  }, []);

  useEffect(() => {
    const onStart = () => startTour();
    window.addEventListener(ALERTING_NAV_START_TOUR_EVENT, onStart);
    return () => window.removeEventListener(ALERTING_NAV_START_TOUR_EVENT, onStart);
  }, [startTour]);

  if (!isTourEnabled) {
    return null;
  }

  return (
    <AlertingNavGuidedTour
      steps={getAlertingNavTourSteps()}
      isActive={isTourActive}
      onFinish={finishTour}
      application={coreStart.application}
      sideNav={coreStart.chrome.sideNav}
    />
  );
};
