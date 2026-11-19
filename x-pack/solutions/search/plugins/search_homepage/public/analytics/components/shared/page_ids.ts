/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANALYTICS_TELEMETRY_PREFIX } from '../../constants';

export type AnalyticsPageId = 'home' | 'onboarding';

const TEST_SUBJ_PREFIXES: Readonly<Record<AnalyticsPageId, string>> = {
  home: 'analyticsHome',
  onboarding: 'analyticsOnboarding',
};

export const getPageTestSubj = (page: AnalyticsPageId, name: string): string =>
  `${TEST_SUBJ_PREFIXES[page]}${name}`;

export const getPageTelemetryId = (page: AnalyticsPageId, name: string): string =>
  `${ANALYTICS_TELEMETRY_PREFIX}-${page}-${name}`;
