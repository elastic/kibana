/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';

export const GENERATED_DASHBOARD_REFRESH_INTERVAL_MS = 30_000;
export const GENERATED_DASHBOARD_REFRESH_INTERVAL_SECONDS =
  GENERATED_DASHBOARD_REFRESH_INTERVAL_MS / 1000;

/** Turns auto-refresh on for a dashboard generated from the analytics pages. */
export const withAutoRefresh = (params: DashboardLocatorParams): DashboardLocatorParams => ({
  ...params,
  refresh_interval: { pause: false, value: GENERATED_DASHBOARD_REFRESH_INTERVAL_MS },
});
