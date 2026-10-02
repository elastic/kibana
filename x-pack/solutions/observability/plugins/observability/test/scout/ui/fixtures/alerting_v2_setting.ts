/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_SHOW_V1_OBSERVABILITY_ALERTS_TABLE_SETTING_ID } from '@kbn/alerting-v2-constants';
import type { KbnClient } from '@kbn/scout-oblt';

interface ScoutSpaceUiSettings {
  uiSettings: {
    set: (values: Record<string, boolean>) => Promise<unknown>;
    unset: (key: string) => Promise<unknown>;
  };
}

/**
 * Unsets the space-scoped V1 alerts table toggle on spaces this Scout config
 * owns: `default` and `test-space-N`. Does not touch other named spaces on a
 * shared or Cloud server.
 */
export const unsetAlertingV2ShowV1AlertsTableSetting = async (
  kbnClient: KbnClient
): Promise<void> => {
  const spaceIds = await listOwnedSpaceIds(kbnClient);

  await Promise.all(
    spaceIds.map((spaceId) =>
      kbnClient.uiSettings.unset(ALERTING_V2_SHOW_V1_OBSERVABILITY_ALERTS_TABLE_SETTING_ID, {
        space: spaceId === DEFAULT_SPACE_ID ? undefined : spaceId,
      })
    )
  );
};

/**
 * Restore the V1 alerts table setting to its default and wait for the uiSettings
 * cache so later suites on a shared Scout server observe the reset.
 */
export const resetAlertingV2NavSettings = async (kbnClient: KbnClient): Promise<void> => {
  await unsetAlertingV2ShowV1AlertsTableSetting(kbnClient);
  await kbnClient.uiSettings.waitForEventualCacheRefresh();
};

const DEFAULT_SPACE_ID = 'default';
const SCOUT_TEST_SPACE_ID = /^test-space-\d+$/;

const isSuiteOwnedSpace = (spaceId: string): boolean =>
  spaceId === DEFAULT_SPACE_ID || SCOUT_TEST_SPACE_ID.test(spaceId);

const isSpacesUnavailableError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  (error as { status?: number }).status === 404;

const listOwnedSpaceIds = async (kbnClient: KbnClient): Promise<string[]> => {
  try {
    const spaces = (await kbnClient.spaces.list()) as Array<{ id?: string }> | undefined;
    const ids = (spaces ?? [])
      .map((space) => space.id)
      .filter((id): id is string => typeof id === 'string')
      .filter(isSuiteOwnedSpace);
    return ids.length > 0 ? ids : [DEFAULT_SPACE_ID];
  } catch (error) {
    if (isSpacesUnavailableError(error)) {
      return [DEFAULT_SPACE_ID];
    }
    throw error;
  }
};

/**
 * Sets the space-scoped V1 alerts table toggle, then waits so the write is
 * visible on every Kibana node before navigation.
 */
export const setAlertingV2NavSettings = async (
  kbnClient: KbnClient,
  scoutSpace: ScoutSpaceUiSettings,
  { showV1AlertsTable }: { showV1AlertsTable: boolean }
): Promise<void> => {
  await scoutSpace.uiSettings.set({
    [ALERTING_V2_SHOW_V1_OBSERVABILITY_ALERTS_TABLE_SETTING_ID]: showV1AlertsTable,
  });
  await kbnClient.uiSettings.waitForEventualCacheRefresh();
};
