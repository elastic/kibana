/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import useObservable from 'react-use/lib/useObservable';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  ALERTING_NAV_START_TOUR_EVENT,
  ALERTING_NAV_TOUR_STORAGE_KEY,
  type AlertingNavTourPersistedState,
  DEFAULT_ALERTING_NAV_TOUR_STATE,
} from './alerting_nav_tour_state';
import { canOfferAlertingNavTour } from './can_offer_alerting_nav_tour';
import { UnifiedAlertingPromoCard } from './unified_alerting_promo_card';

const PROMO_REGION_LABEL = i18n.translate(
  'xpack.observability.alertingNavTour.promoRegionAriaLabel',
  {
    defaultMessage: 'Unified Alerting app',
  }
);

/**
 * Floating Unified Alerting promo for the Alerts landing route.
 * Mount inside that route tree so visibility follows React Router — not history patching.
 */
export const AlertingNavPromo: React.FC<{ coreStart: CoreStart }> = ({ coreStart }) => {
  const { euiTheme } = useEuiTheme();
  // Re-evaluate when solution nav id changes (Classic ↔ project).
  useObservable(
    coreStart.chrome.getActiveSolutionNavId$(),
    coreStart.chrome.getActiveSolutionNavId()
  );
  const canTakeTour = canOfferAlertingNavTour(coreStart);
  const [persisted = DEFAULT_ALERTING_NAV_TOUR_STATE, setPersisted] =
    useLocalStorage<AlertingNavTourPersistedState>(
      ALERTING_NAV_TOUR_STORAGE_KEY,
      DEFAULT_ALERTING_NAV_TOUR_STATE
    );

  const dismiss = useCallback(() => {
    setPersisted({ isDismissed: true });
  }, [setPersisted]);

  const takeTour = useCallback(() => {
    if (!canTakeTour) {
      return;
    }
    // Opting into the tour dismisses the promo so it does not return after Finish/Skip.
    setPersisted({ isDismissed: true });
    window.dispatchEvent(new Event(ALERTING_NAV_START_TOUR_EVENT));
  }, [canTakeTour, setPersisted]);

  if (persisted.isDismissed) {
    return null;
  }

  return (
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
      <UnifiedAlertingPromoCard
        onTakeTour={takeTour}
        onDismiss={dismiss}
        showTakeTour={canTakeTour}
      />
    </div>
  );
};
