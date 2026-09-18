/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTING_V2_ENABLED_SETTING_ID,
  ALERTING_V2_SHOW_CLASSIC_ALERTS_PAGE_SETTING_ID,
} from '@kbn/alerting-v2-constants';
import type { KbnClient } from '@kbn/scout-oblt';

/**
 * Internal route: serverless disables the public `/api/kibana/global_settings`
 * API (`uiSettings.publicApiEnabled` defaults to false).
 */
const GLOBAL_SETTINGS_PATH = `/internal/kibana/global_settings/${encodeURIComponent(
  ALERTING_V2_ENABLED_SETTING_ID
)}`;

interface ScoutSpaceUiSettings {
  uiSettings: {
    set: (values: Record<string, boolean>) => Promise<unknown>;
    unset: (key: string) => Promise<unknown>;
  };
}

/**
 * Toggles the `alerting:v2:enabled` global advanced setting at runtime.
 * The default Scout server leaves this setting unpinned, unlike `scout_alerting_v2`.
 */
export const setAlertingV2EnabledSetting = async (
  kbnClient: KbnClient,
  enabled: boolean
): Promise<void> => {
  await kbnClient.uiSettings.updateGlobal({
    [ALERTING_V2_ENABLED_SETTING_ID]: enabled,
  });
  await kbnClient.uiSettings.waitForEventualCacheRefresh();
};

/** DELETE is a no-op when no user value is set. */
export const unsetAlertingV2EnabledSetting = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.request({
    description: `unset ${ALERTING_V2_ENABLED_SETTING_ID}`,
    path: GLOBAL_SETTINGS_PATH,
    method: 'DELETE',
  });
};

/**
 * Unsets the space-scoped classic-table toggle on every Kibana space.
 * Sequential spaceTest workers write this on `test-space-N`; a later config
 * reuses those spaces on a shared Scout server.
 */
export const unsetAlertingV2ShowClassicAlertsTableSetting = async (
  kbnClient: KbnClient
): Promise<void> => {
  const spaceIds = await listSpaceIds(kbnClient);

  await Promise.all(
    spaceIds.map((spaceId) =>
      kbnClient.uiSettings.unset(ALERTING_V2_SHOW_CLASSIC_ALERTS_PAGE_SETTING_ID, {
        space: spaceId === 'default' ? undefined : spaceId,
      })
    )
  );
};

/**
 * Restore both nav settings to their defaults and wait for the uiSettings
 * cache so later suites on a shared Scout server observe the reset.
 */
export const resetAlertingV2NavSettings = async (kbnClient: KbnClient): Promise<void> => {
  await unsetAlertingV2EnabledSetting(kbnClient);
  await unsetAlertingV2ShowClassicAlertsTableSetting(kbnClient);
  await kbnClient.uiSettings.waitForEventualCacheRefresh();
};

const listSpaceIds = async (kbnClient: KbnClient): Promise<string[]> => {
  try {
    const spaces = (await kbnClient.spaces.list()) as Array<{ id?: string }> | undefined;
    const ids = (spaces ?? []).map((space) => space.id).filter((id): id is string => Boolean(id));
    return ids.length > 0 ? ids : ['default'];
  } catch {
    return ['default'];
  }
};

/**
 * Sets the global v2 flag and the space-scoped classic-page toggle, then waits
 * once so both writes are visible on every Kibana node before navigation.
 */
export const setAlertingV2NavSettings = async (
  kbnClient: KbnClient,
  scoutSpace: ScoutSpaceUiSettings,
  { v2Enabled, showClassicAlertsPage }: { v2Enabled: boolean; showClassicAlertsPage: boolean }
): Promise<void> => {
  await kbnClient.uiSettings.updateGlobal({
    [ALERTING_V2_ENABLED_SETTING_ID]: v2Enabled,
  });
  await scoutSpace.uiSettings.set({
    [ALERTING_V2_SHOW_CLASSIC_ALERTS_PAGE_SETTING_ID]: showClassicAlertsPage,
  });
  await kbnClient.uiSettings.waitForEventualCacheRefresh();
};
