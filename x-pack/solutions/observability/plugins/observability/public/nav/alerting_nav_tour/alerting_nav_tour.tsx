/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { CoreStart } from '@kbn/core/public';
import { ALERTING_ONBOARDING_START_TOUR_EVENT } from '@kbn/alerting-v2-constants';
import {
  ALERTING_NAV_TOUR_STORAGE_KEY,
  ALERTING_PANEL_FOOTER_SELECTOR,
  DEFAULT_ALERTING_NAV_TOUR_STATE,
  type AlertingNavTourPersistedState,
} from './constants';
import { AlertingNavGuidedTour } from './guided_tour';
import { getAlertingNavTourSteps } from './tour_steps';
import { UnifiedAlertingPromoCard } from './unified_alerting_promo_card';

interface AlertingNavTourProps {
  coreStart: CoreStart;
}

const useAlertingPanelFooter = (): Element | null => {
  const [footer, setFooter] = useState<Element | null>(() =>
    typeof document !== 'undefined' ? document.querySelector(ALERTING_PANEL_FOOTER_SELECTOR) : null
  );

  useEffect(() => {
    const sync = () => setFooter(document.querySelector(ALERTING_PANEL_FOOTER_SELECTOR));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return footer;
};

/**
 * Renders the Unified Alerting promo card in the Alerting side-nav panel footer
 * and drives the guided tour across Alerts, Rules, Action policies, Execution
 * history, and Maintenance windows.
 */
export const AlertingNavTour: React.FC<AlertingNavTourProps> = ({ coreStart }) => {
  const isTourEnabled = coreStart.notifications.tours.isEnabled();
  const footerEl = useAlertingPanelFooter();
  const [persisted = DEFAULT_ALERTING_NAV_TOUR_STATE, setPersisted] =
    useLocalStorage<AlertingNavTourPersistedState>(
      ALERTING_NAV_TOUR_STORAGE_KEY,
      DEFAULT_ALERTING_NAV_TOUR_STATE
    );
  const [isTourActive, setIsTourActive] = useState(false);

  const dismiss = useCallback(() => {
    setPersisted({ ...persisted, isDismissed: true });
    setIsTourActive(false);
  }, [persisted, setPersisted]);

  const finishTour = useCallback(() => {
    setIsTourActive(false);
    setPersisted({ ...persisted, isTourComplete: true });
  }, [persisted, setPersisted]);

  const startTour = useCallback(() => {
    if (!isTourEnabled) {
      return;
    }
    setIsTourActive(true);
  }, [isTourEnabled]);

  useEffect(() => {
    const onStartTourEvent = () => startTour();
    window.addEventListener(ALERTING_ONBOARDING_START_TOUR_EVENT, onStartTourEvent);
    return () => {
      window.removeEventListener(ALERTING_ONBOARDING_START_TOUR_EVENT, onStartTourEvent);
    };
  }, [startTour]);

  const tourSteps = getAlertingNavTourSteps(coreStart.docLinks.links.alerting.actionPolicies);
  const showPromoCard = !persisted.isDismissed;

  return (
    <>
      {showPromoCard && footerEl
        ? createPortal(
            <UnifiedAlertingPromoCard onTakeTour={startTour} onDismiss={dismiss} />,
            footerEl
          )
        : null}
      {isTourEnabled ? (
        <AlertingNavGuidedTour
          steps={tourSteps}
          isActive={isTourActive}
          onFinish={finishTour}
          application={coreStart.application}
        />
      ) : null}
    </>
  );
};
