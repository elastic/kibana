/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTING_NAV_TOUR_STORAGE_KEY = 'observability.alertingNavTour.v3';

/** Window event to start this tour from other surfaces (e.g. promo, onboarding). */
export const ALERTING_NAV_START_TOUR_EVENT = 'kbn:alertingOnboarding:startTour';

export interface AlertingNavTourPersistedState {
  isDismissed: boolean;
}

export const DEFAULT_ALERTING_NAV_TOUR_STATE: AlertingNavTourPersistedState = {
  isDismissed: false,
};
