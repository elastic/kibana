/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SETTINGS_TAB_IDS, type SettingsTabId } from '@kbn/nightshift-shared';

export { SETTINGS_TAB_IDS, type SettingsTabId };

export const isSettingsTabId = (value: string): value is SettingsTabId =>
  (SETTINGS_TAB_IDS as readonly string[]).includes(value);

/** Returns the tabs in display order, hiding General when Apps is unavailable. */
export const getVisibleSettingsTabs = ({
  isAppsEnabled,
}: {
  isAppsEnabled: boolean;
}): SettingsTabId[] => SETTINGS_TAB_IDS.filter((id) => id !== 'general' || isAppsEnabled);

export const getDefaultSettingsTab = (visible: readonly SettingsTabId[]): SettingsTabId =>
  visible.includes('general') ? 'general' : 'detections';
