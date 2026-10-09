/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import useObservable from 'react-use/lib/useObservable';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import {
  OBSERVABILITY_ALERTING_ALERTS_PATH,
  OBSERVABILITY_ALERTING_APP_ID,
} from '@kbn/deeplinks-observability';
import { AlertingNavGuidedTour } from './guided_tour';
import { getAlertingNavTourSteps } from './tour_steps';
import { UnifiedAlertingPromoCard } from './unified_alerting_promo_card';

const ALERTING_NAV_TOUR_STORAGE_KEY = 'observability.alertingNavTour.v3';

/** Window event to start this tour from other surfaces (e.g. onboarding). */
export const ALERTING_NAV_START_TOUR_EVENT = 'kbn:alertingOnboarding:startTour';

interface AlertingNavTourPersistedState {
  isDismissed: boolean;
}

const DEFAULT_STATE: AlertingNavTourPersistedState = { isDismissed: false };

const isAlertsLandingPath = (pathname: string): boolean => {
  // Match `/app/observabilityAlerting/alerts` (with optional trailing slash / query handled by caller).
  const path = pathname.split('?')[0].replace(/\/$/, '');
  return path.endsWith(OBSERVABILITY_ALERTING_ALERTS_PATH);
};

/**
 * Promo card on the Alerting Alerts landing page (bottom-right) + guided tour.
 * Spike alternative to side-nav footer placement — see elastic/rna-program#1212.
 */
export const AlertingNavTour: React.FC<{ coreStart: CoreStart }> = ({ coreStart }) => {
  const { euiTheme } = useEuiTheme();
  const isTourEnabled = coreStart.notifications.tours.isEnabled();
  const currentAppId = useObservable(coreStart.application.currentAppId$, undefined);
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : ''
  );
  const [persisted = DEFAULT_STATE, setPersisted] = useLocalStorage<AlertingNavTourPersistedState>(
    ALERTING_NAV_TOUR_STORAGE_KEY,
    DEFAULT_STATE
  );
  const [isTourActive, setIsTourActive] = useState(false);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    // Kibana navigations often use history.pushState without a popstate event.
    const { pushState, replaceState } = window.history;
    window.history.pushState = function pushStatePatched(...args) {
      pushState.apply(this, args);
      setPathname(window.location.pathname);
    };
    window.history.replaceState = function replaceStatePatched(...args) {
      replaceState.apply(this, args);
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

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

  const showPromoCard =
    !persisted.isDismissed &&
    !isTourActive &&
    currentAppId === OBSERVABILITY_ALERTING_APP_ID &&
    isAlertsLandingPath(pathname);

  return (
    <>
      {showPromoCard ? (
        <div
          data-test-subj="alertingNavPromoFloatingAnchor"
          css={css`
            position: fixed;
            z-index: ${euiTheme.levels.flyout};
            right: ${euiTheme.size.l};
            bottom: ${euiTheme.size.l};
            width: 280px;
            max-width: calc(100vw - ${euiTheme.size.xl});
          `}
        >
          <UnifiedAlertingPromoCard onTakeTour={startTour} onDismiss={dismiss} />
        </div>
      ) : null}
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
