/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';
import type { ChromeStart, CoreStart } from '@kbn/core/public';

/** Project/solution side nav is active (not Classic Kibana chrome nav). */
export const isProjectNavigationActive = (chrome: ChromeStart): boolean =>
  chrome.getActiveSolutionNavId() != null;

/**
 * Whether Take tour / guided tour should run for the current session.
 *
 * Interim: require project nav + Alerting v2 enabled — same world where the
 * Unified Alerting side-nav panel (and its tour anchors) exist. When v2-off
 * Alerting nav ships, extend this (and tour steps) for Classic/v1 surfaces
 * instead of offering a half-broken Universal tour.
 */
export const canOfferAlertingNavTour = (coreStart: CoreStart): boolean =>
  coreStart.notifications.tours.isEnabled() &&
  isProjectNavigationActive(coreStart.chrome) &&
  isAlertingV2Enabled(coreStart);
