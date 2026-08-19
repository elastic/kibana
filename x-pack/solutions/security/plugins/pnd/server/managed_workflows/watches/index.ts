/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SYSTEM_SECURITY_WATCH_IDS } from '@kbn/pnd-common';
import { PND_WATCH_FLOOR_WORKFLOW_ID } from '@kbn/workflows/managed';
import { watchFloorSettings } from './watch_floor_settings';
import type { WatchSettingsRegistration } from './types';

type RegisteredWatchId = (typeof SYSTEM_SECURITY_WATCH_IDS)[number];

export const watchSettingsById: Partial<Record<RegisteredWatchId, WatchSettingsRegistration>> = {
  [PND_WATCH_FLOOR_WORKFLOW_ID]: watchFloorSettings,
};

export { watchFloorSettings } from './watch_floor_settings';
export type { WatchFloorTemplateValues } from './watch_floor_settings';
export type { WatchSettingsPatch, WatchSettingsRegistration } from './types';
