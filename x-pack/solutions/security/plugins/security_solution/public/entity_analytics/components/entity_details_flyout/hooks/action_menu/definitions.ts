/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SHARED_ACTION_IDS } from '../../../../../common/components/security_action_menu';
import type { SecurityActionMenuPreset } from '../../../../../common/components/security_action_menu';

export const RISK_INPUT_ACTION_IDS = {
  addToNewTimeline: 'addToNewTimeline',
  addToCase: SHARED_ACTION_IDS.addToCase,
} as const;

export type RiskInputActionId = (typeof RISK_INPUT_ACTION_IDS)[keyof typeof RISK_INPUT_ACTION_IDS];

export const ENTITY_DETAILS_FLYOUT_RISK_INPUT_ACTION_MENU_PRESET: SecurityActionMenuPreset<
  RiskInputActionId,
  'investigation' | 'cases'
> = {
  groups: [
    { id: 'investigation', actionIds: [RISK_INPUT_ACTION_IDS.addToNewTimeline] },
    { id: 'cases', actionIds: [RISK_INPUT_ACTION_IDS.addToCase] },
  ],
};
