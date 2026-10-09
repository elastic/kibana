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
import { AlertingNavGuidedTour } from './guided_tour';
import { getAlertingNavTourSteps } from './tour_steps';
import { UnifiedAlertingPromoCard } from './unified_alerting_promo_card';

const ALERTING_NAV_TOUR_STORAGE_KEY = 'observability.alertingNavTour.v3';
const ALERTING_PANEL_FOOTER_SELECTOR =
  '[data-test-subj~="kbnChromeNav-sidePanel_alerting"] [data-test-subj="kbnChromeNav-panelFooter"]';

/** Window event to start this tour from other surfaces (e.g. onboarding). */
export const ALERTING_NAV_START_TOUR_EVENT = 'kbn:alertingOnboarding:startTour';

interface AlertingNavTourPersistedState {
  isDismissed: boolean;
}

const DEFAULT_STATE: AlertingNavTourPersistedState = { isDismissed: false };

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

/** Promo card in the Alerting side-nav footer + guided tour across Alerting pages. */
export const AlertingNavTour: React.FC<{ coreStart: CoreStart }> = ({ coreStart }) => {
  const isTourEnabled = coreStart.notifications.tours.isEnabled();
  const footerEl = useAlertingPanelFooter();
  const [persisted = DEFAULT_STATE, setPersisted] = useLocalStorage<AlertingNavTourPersistedState>(
    ALERTING_NAV_TOUR_STORAGE_KEY,
    DEFAULT_STATE
  );
  const [isTourActive, setIsTourActive] = useState(false);

  const dismiss = useCallback(() => {
    setPersisted({ isDismissed: true });
    setIsTourActive(false);
  }, [setPersisted]);

  const startTour = useCallback(() => {
    if (isTourEnabled) {
      setIsTourActive(true);
    }
  }, [isTourEnabled]);

  useEffect(() => {
    const onStart = () => startTour();
    window.addEventListener(ALERTING_NAV_START_TOUR_EVENT, onStart);
    return () => window.removeEventListener(ALERTING_NAV_START_TOUR_EVENT, onStart);
  }, [startTour]);

  return (
    <>
      {!persisted.isDismissed && footerEl
        ? createPortal(
            <UnifiedAlertingPromoCard onTakeTour={startTour} onDismiss={dismiss} />,
            footerEl
          )
        : null}
      {isTourEnabled ? (
        <AlertingNavGuidedTour
          steps={getAlertingNavTourSteps()}
          isActive={isTourActive}
          onFinish={() => setIsTourActive(false)}
          application={coreStart.application}
        />
      ) : null}
    </>
  );
};
