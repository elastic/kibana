/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SHARED_ACTION_IDS } from '../../../../common/components/security_action_menu';
import type { SecurityActionMenuPreset } from '../../../../common/components/security_action_menu';

export type AlertSummaryActionId =
  | typeof SHARED_ACTION_IDS.addToCase
  | typeof SHARED_ACTION_IDS.applyAlertTags;

export const ALERT_SUMMARY_ACTION_MENU_PRESET: SecurityActionMenuPreset<
  AlertSummaryActionId,
  'collaboration'
> = {
  groups: [
    {
      id: 'collaboration',
      actionIds: [SHARED_ACTION_IDS.addToCase, SHARED_ACTION_IDS.applyAlertTags],
    },
  ],
};
