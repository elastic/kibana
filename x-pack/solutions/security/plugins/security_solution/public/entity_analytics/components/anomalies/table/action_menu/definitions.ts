/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityActionMenuPreset } from '../../../../../common/components/security_action_menu';

export const ANOMALY_ACTION_IDS = {
  navigationActions: 'anomalyNavigationActions',
} as const;

export type AnomalyActionId = (typeof ANOMALY_ACTION_IDS)[keyof typeof ANOMALY_ACTION_IDS];

export const ANOMALY_TABLE_ROW_ACTION_MENU_PRESET: SecurityActionMenuPreset<
  AnomalyActionId,
  'navigation'
> = {
  groups: [{ id: 'navigation', actionIds: [ANOMALY_ACTION_IDS.navigationActions] }],
};
