/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * POC: User Storage keys that replace Security Solution `localStorage` preferences.
 * Flat keys, namespaced by prefix. Values are small (KB), see the schemas in the server registration.
 */
export const USER_SETTINGS_KEYS = {
  /** Last selected tab of the document details flyout (v2). */
  FLYOUT_SELECTED_TAB: 'securitySolution:flyout.document.selectedTab',
  /** Map of overview section title (lowercase) -> expanded. */
  FLYOUT_OVERVIEW_SECTIONS: 'securitySolution:flyout.document.overviewSections',
  /** Map of alerts table id -> visible columns. Per space. */
  ALERTS_TABLE_COLUMNS: 'securitySolution:alertsTable.columns',
} as const;

export type UserSettingsKey = (typeof USER_SETTINGS_KEYS)[keyof typeof USER_SETTINGS_KEYS];
