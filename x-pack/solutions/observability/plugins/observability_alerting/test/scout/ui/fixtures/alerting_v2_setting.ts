/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';
import type { KbnClient } from '@kbn/scout-oblt';

/**
 * Internal route: serverless disables the public `/api/kibana/global_settings`
 * API (`uiSettings.publicApiEnabled` defaults to false).
 */
const GLOBAL_SETTINGS_PATH = `/internal/kibana/global_settings/${encodeURIComponent(
  ALERTING_V2_ENABLED_SETTING_ID
)}`;

/**
 * Toggles the `alerting:v2:enabled` global advanced setting at runtime.
 * Matches the alerting_v2 `test/scout` skill-gating suite: the default Scout
 * server leaves this setting unpinned, unlike `scout_alerting_v2`.
 */
export const setAlertingV2EnabledSetting = async (
  kbnClient: KbnClient,
  enabled: boolean
): Promise<void> => {
  await kbnClient.uiSettings.updateGlobal({
    [ALERTING_V2_ENABLED_SETTING_ID]: enabled,
  });
};

/** DELETE is a no-op when no user value is set. */
export const unsetAlertingV2EnabledSetting = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.request({
    description: `unset ${ALERTING_V2_ENABLED_SETTING_ID}`,
    path: GLOBAL_SETTINGS_PATH,
    method: 'DELETE',
  });
};
