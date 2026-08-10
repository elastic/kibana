/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SHARED_ACTION_IDS } from '../../../../common/components/security_action_menu';
import type { SecurityActionMenuPreset } from '../../../../common/components/security_action_menu';

export const ATTACK_ACTION_IDS = {
  addToCase: SHARED_ACTION_IDS.addToCase,
  changeAttackStatus: 'changeAttackStatus',
  applyAttackTags: 'applyAttackTags',
  manageAttackAssignees: 'manageAttackAssignees',
  runWorkflow: SHARED_ACTION_IDS.runWorkflow,
  openAiAssistant: SHARED_ACTION_IDS.openAiAssistant,
  addToDataset: SHARED_ACTION_IDS.addToDataset,
  investigateInTimeline: SHARED_ACTION_IDS.investigateInTimeline,
  exploreInAttacks: 'exploreInAttacks',
} as const;

export type AttackActionId = (typeof ATTACK_ACTION_IDS)[keyof typeof ATTACK_ACTION_IDS];

const ATTACK_ACTION_GROUPS = {
  cases: 'cases',
  management: 'management',
  ai: 'ai',
  investigation: 'investigation',
} as const;

type AttackActionGroupId = (typeof ATTACK_ACTION_GROUPS)[keyof typeof ATTACK_ACTION_GROUPS];

export const ATTACKS_TABLE_GROUP_ACTION_MENU_PRESET: SecurityActionMenuPreset<
  AttackActionId,
  AttackActionGroupId
> = {
  groups: [
    { id: ATTACK_ACTION_GROUPS.cases, actionIds: [ATTACK_ACTION_IDS.addToCase] },
    {
      id: ATTACK_ACTION_GROUPS.management,
      actionIds: [
        ATTACK_ACTION_IDS.changeAttackStatus,
        ATTACK_ACTION_IDS.applyAttackTags,
        ATTACK_ACTION_IDS.manageAttackAssignees,
        ATTACK_ACTION_IDS.runWorkflow,
      ],
    },
    {
      id: ATTACK_ACTION_GROUPS.ai,
      actionIds: [ATTACK_ACTION_IDS.openAiAssistant, ATTACK_ACTION_IDS.addToDataset],
    },
    {
      id: ATTACK_ACTION_GROUPS.investigation,
      actionIds: [
        ATTACK_ACTION_IDS.investigateInTimeline,
        ATTACK_ACTION_IDS.exploreInAttacks,
      ],
    },
  ],
};
