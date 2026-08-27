/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';
import type { SYSTEM_SECURITY_WATCH_IDS } from '@kbn/pnd-common';
import { createWatchSettingsRegistration } from './watch_settings';
import type { WatchSettingsRegistration } from './types';

type RegisteredWatchId = (typeof SYSTEM_SECURITY_WATCH_IDS)[number];

export const watchSettingsById: Record<RegisteredWatchId, WatchSettingsRegistration> = {
  [SYSTEM_SECURITY_WATCH_FLOOR_ID]: createWatchSettingsRegistration(SYSTEM_SECURITY_WATCH_FLOOR_ID),
  [SYSTEM_SECURITY_WATCH_OFFICER_ID]: createWatchSettingsRegistration(
    SYSTEM_SECURITY_WATCH_OFFICER_ID
  ),
  [SYSTEM_SECURITY_WATCH_DARK_ID]: createWatchSettingsRegistration(SYSTEM_SECURITY_WATCH_DARK_ID),
  [SYSTEM_SECURITY_WATCH_DEEP_ID]: createWatchSettingsRegistration(SYSTEM_SECURITY_WATCH_DEEP_ID),
  [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID]: createWatchSettingsRegistration(
    SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID
  ),
};

export { createWatchSettingsRegistration } from './watch_settings';
export type { WatchSettingsPatch, WatchSettingsRegistration } from './types';
