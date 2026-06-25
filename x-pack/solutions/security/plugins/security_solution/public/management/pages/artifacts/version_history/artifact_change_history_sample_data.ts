/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ArtifactChangeHistoryItem } from './types';
import { AdministrationSubTab } from '../../../types';
import { PROTOTYPE_ARTIFACT_ITEM_IDS } from './artifact_prototype_sample_items';
import {
  BLOCKLIST_TAB,
  ENDPOINT_EXCEPTIONS_TAB,
  EVENT_FILTERS_TAB,
  TRUSTED_APPS_TAB,
  TRUSTED_DEVICES_TAB,
} from '../../../common/translations';

const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const ARTIFACT_CHANGE_HISTORY_STARTED_AT = '2026-01-01T00:00:00.000Z';

export const ARTIFACT_CHANGE_HISTORY_SAMPLE_DATA: ArtifactChangeHistoryItem[] = [
  {
    id: 'exceptions-brian-3d',
    artifactTypeLabel: ENDPOINT_EXCEPTIONS_TAB,
    userName: 'Brian M',
    timestamp: daysAgo(3),
    changeCount: 4,
    artifactTab: AdministrationSubTab.endpointExceptions,
    artifactItemId: PROTOTYPE_ARTIFACT_ITEM_IDS.endpointException,
  },
  {
    id: 'trusted-apps-brian-1w',
    artifactTypeLabel: TRUSTED_APPS_TAB,
    userName: 'Brian M',
    timestamp: daysAgo(7),
    changeCount: 29,
    artifactTab: AdministrationSubTab.trustedApps,
    artifactItemId: PROTOTYPE_ARTIFACT_ITEM_IDS.trustedAppItTools,
  },
  {
    id: 'trusted-devices-raquel-2w',
    artifactTypeLabel: TRUSTED_DEVICES_TAB,
    userName: 'Raquel T',
    timestamp: daysAgo(14),
    changeCount: 5,
    artifactTab: AdministrationSubTab.trustedDevices,
    artifactItemId: PROTOTYPE_ARTIFACT_ITEM_IDS.trustedDeviceUsbKey,
  },
  {
    id: 'trusted-apps-raquel-1m',
    artifactTypeLabel: TRUSTED_APPS_TAB,
    userName: 'Raquel T',
    timestamp: daysAgo(30),
    changeCount: 23,
    artifactTab: AdministrationSubTab.trustedApps,
    artifactItemId: PROTOTYPE_ARTIFACT_ITEM_IDS.trustedAppLegacyBackup,
  },
  {
    id: 'blocklist-roxana-1m',
    artifactTypeLabel: BLOCKLIST_TAB,
    userName: 'Roxana G',
    timestamp: daysAgo(30),
    changeCount: 23,
    artifactTab: AdministrationSubTab.blocklist,
    artifactItemId: PROTOTYPE_ARTIFACT_ITEM_IDS.blocklistEmotet,
  },
  {
    id: 'event-filters-roxana-1m',
    artifactTypeLabel: EVENT_FILTERS_TAB,
    userName: 'Roxana G',
    timestamp: daysAgo(30),
    changeCount: 23,
    artifactTab: AdministrationSubTab.eventFilters,
    artifactItemId: PROTOTYPE_ARTIFACT_ITEM_IDS.eventFilterCleanup,
  },
];
