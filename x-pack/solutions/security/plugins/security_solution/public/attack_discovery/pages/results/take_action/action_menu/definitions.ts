/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SHARED_ACTION_IDS } from '../../../../../common/components/security_action_menu';
import type { SecurityActionMenuPreset } from '../../../../../common/components/security_action_menu';

export const ATTACK_DISCOVERY_ACTION_IDS = {
  changeAttackDiscoveryStatus: 'changeAttackDiscoveryStatus',
  runWorkflow: SHARED_ACTION_IDS.runWorkflow,
  addToCase: SHARED_ACTION_IDS.addToCase,
  openAiAssistant: SHARED_ACTION_IDS.openAiAssistant,
  addToDataset: SHARED_ACTION_IDS.addToDataset,
} as const;

export type AttackDiscoveryActionId =
  (typeof ATTACK_DISCOVERY_ACTION_IDS)[keyof typeof ATTACK_DISCOVERY_ACTION_IDS];

export const ATTACK_DISCOVERY_RESULTS_ACTION_MENU_PRESET: SecurityActionMenuPreset<
  AttackDiscoveryActionId,
  'workflow' | 'cases' | 'ai'
> = {
  groups: [
    {
      id: 'workflow',
      actionIds: [
        ATTACK_DISCOVERY_ACTION_IDS.changeAttackDiscoveryStatus,
        ATTACK_DISCOVERY_ACTION_IDS.runWorkflow,
      ],
    },
    { id: 'cases', actionIds: [ATTACK_DISCOVERY_ACTION_IDS.addToCase] },
    {
      id: 'ai',
      actionIds: [
        ATTACK_DISCOVERY_ACTION_IDS.openAiAssistant,
        ATTACK_DISCOVERY_ACTION_IDS.addToDataset,
      ],
    },
  ],
};
