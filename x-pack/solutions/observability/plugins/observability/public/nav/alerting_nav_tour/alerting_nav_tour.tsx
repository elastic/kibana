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
import { i18n } from '@kbn/i18n';
import {
  OBSERVABILITY_ALERTING_ALERTS_PATH,
  OBSERVABILITY_ALERTING_APP_ID,
} from '@kbn/deeplinks-observability';
import { AlertingNavGuidedTour } from './guided_tour';
import { getAlertingNavTourSteps } from './tour_steps';
import { UnifiedAlertingPromoCard } from './unified_alerting_promo_card';
import { useWindowPathname } from './use_window_pathname';

const ALERTING_NAV_TOUR_STORAGE_KEY = 'observability.alertingNavTour.v3';

/** Window event to start this tour from other surfaces (e.g. onboarding). */
export const ALERTING_NAV_START_TOUR_EVENT = 'kbn:alertingOnboarding:startTour';

interface AlertingNavTourPersistedState {
  isDismissed: boolean;
}

const DEFAULT_STATE: AlertingNavTourPersistedState = { isDismissed: false };

const normalizePathname = (pathname: string): string => pathname.split('?')[0].replace(/\/$/, '');

/** Alerting Alerts landing (`/app/observabilityAlerting/alerts`). */
const isAlertsLandingPath = (pathname: string): boolean =>
  normalizePathname(pathname).endsWith(OBSERVABILITY_ALERTING_ALERTS_PATH);

const isPromoEntryPath = (appId: string | undefined, pathname: string): boolean =>
  appId === OBSERVABILITY_ALERTING_APP_ID && isAlertsLandingPath(pathname);

const PROMO_REGION_LABEL = i18n.translate(
  'xpack.observability.alertingNavTour.promo.regionLabel',
  {
    defaultMessage: 'Unified Alerting app',
  }
);

/**
 * Floating promo (bottom-right) on Alerting Alerts landing, plus guided tour.
 * Overview placement is intentionally deferred to a follow-up.
 */
export const AlertingNavTour: React.FC<{ coreStart: CoreStart }> = ({ coreStart }) => {
  const { euiTheme } = useEuiTheme();
  const isTourEnabled = coreStart.notifications.tours.isEnabled();
  const currentAppId = useObservable(coreStart.application.currentAppId$, undefined);
  const pathname = useWindowPathname();
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
    if (!isTourEnabled) {
      return;
    }
    // Opting into the tour counts as dismissing the promo so it does not return after Finish/Skip.
    setPersisted({ isDismissed: true });
    // Side nav expand happens in AlertingNavGuidedTour when the tour becomes active.
    setIsTourActive(true);
  }, [isTourEnabled, setPersisted]);

  const finishTour = useCallback(() => {
    setIsTourActive(false);
  }, []);

  useEffect(() => {
    const onStart = () => startTour();
    window.addEventListener(ALERTING_NAV_START_TOUR_EVENT, onStart);
    return () => window.removeEventListener(ALERTING_NAV_START_TOUR_EVENT, onStart);
  }, [startTour]);

  const showPromoCard =
    !persisted.isDismissed && !isTourActive && isPromoEntryPath(currentAppId, pathname);

  return (
    <>
      {showPromoCard ? (
        <div
          role="region"
          aria-label={PROMO_REGION_LABEL}
          data-test-subj="alertingNavPromoFloatingAnchor"
          css={css`
            position: fixed;
            z-index: ${euiTheme.levels.flyout};
            right: ${euiTheme.size.l};
            bottom: ${euiTheme.size.l};
            width: 248px;
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
          onFinish={finishTour}
          application={coreStart.application}
          sideNav={coreStart.chrome.sideNav}
        />
      ) : null}
    </>
  );
};
