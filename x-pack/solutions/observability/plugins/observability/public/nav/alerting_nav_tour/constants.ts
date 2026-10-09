/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTING_NAV_TOUR_STORAGE_KEY = 'observability.alertingNavTour.v3';

export const ALERTING_NAV_TOUR_TEST_ID_PREFIX = 'alertingNavTourStep';
export const ALERTING_NAV_PROMO_CARD_TEST_ID = 'alertingNavPromoCard';
export const ALERTING_NAV_PROMO_TAKE_TOUR_TEST_ID = 'alertingNavPromoTakeTour';
export const ALERTING_NAV_PROMO_DISMISS_TEST_ID = 'alertingNavPromoDismiss';

export const ALERTING_PANEL_FOOTER_SELECTOR =
  '[data-test-subj~="kbnChromeNav-sidePanel_alerting"] [data-test-subj="kbnChromeNav-panelFooter"]';

/**
 * Window event to start this tour from other surfaces (e.g. Universal rules
 * onboarding). Kept local so this package does not depend on alerting_v2.
 */
export const ALERTING_NAV_START_TOUR_EVENT = 'kbn:alertingOnboarding:startTour';

/** Wait longer for Management pages (e.g. Maintenance Windows) to mount before skipping. */
export const ANCHOR_TIMEOUT_MS = 8000;

/** Promo webp intrinsic size (448×240); used for aspect-ratio so the media scales with the panel. */
export const PROMO_IMAGE_ASPECT_RATIO = '448 / 240';

/** Tour popover width as a multiple of `euiTheme.base` (16 → 320px). */
export const TOUR_POPOVER_WIDTH_BASE_MULTIPLIER = 20;

export interface AlertingNavTourPersistedState {
  isDismissed: boolean;
}

export const DEFAULT_ALERTING_NAV_TOUR_STATE: AlertingNavTourPersistedState = {
  isDismissed: false,
};
