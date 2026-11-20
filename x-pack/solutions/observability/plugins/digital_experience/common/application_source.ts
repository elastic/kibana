/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationPlatform, ApplicationSource, MobilePlatform } from './types/applications';
import { MOBILE_PLATFORMS } from './types/applications';

/** Where an application's data comes from: EDOT or the Classic RUM agent. */
export const APPLICATION_SOURCE = {
  otel: 'otel',
  classic: 'classic',
} as const satisfies Record<ApplicationSource, ApplicationSource>;

/** Where an application runs: a browser, or a mobile platform. */
export const APPLICATION_PLATFORM = {
  browser: 'browser',
  android: 'android',
  ios: 'ios',
} as const satisfies Record<ApplicationPlatform, ApplicationPlatform>;

/** Whether a platform is a mobile one, whose applications have the mobile page. */
export const isMobilePlatform = (platform: string | null | undefined): platform is MobilePlatform =>
  (MOBILE_PLATFORMS as readonly string[]).includes(platform ?? '');
