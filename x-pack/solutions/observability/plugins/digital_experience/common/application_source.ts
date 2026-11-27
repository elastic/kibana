/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationSource, ApplicationType, MobilePlatform } from './types/applications';
import { MOBILE_PLATFORMS } from './types/applications';

/** Where an application's data comes from: EDOT or the Classic RUM agent. */
export const APPLICATION_SOURCE = {
  otel: 'otel',
  classic: 'classic',
} as const satisfies Record<ApplicationSource, ApplicationSource>;

/** What an application is: a web one or a mobile one, which has the mobile page. */
export const APPLICATION_TYPE = {
  web: 'web',
  mobile: 'mobile',
} as const satisfies Record<ApplicationType, ApplicationType>;

/** The platforms a mobile application runs on. */
export const MOBILE_PLATFORM = {
  android: 'android',
  ios: 'ios',
} as const satisfies Record<MobilePlatform, MobilePlatform>;

/** Whether a value is a mobile platform. */
export const isMobilePlatform = (platform: string | null | undefined): platform is MobilePlatform =>
  (MOBILE_PLATFORMS as readonly string[]).includes(platform ?? '');
