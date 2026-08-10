/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applySecurityActionMenuItemMetadata,
  SHARED_ACTION_IDS,
  SHARED_ACTION_MENU_ITEM_DEFINITIONS,
} from '../../../../../common/components/security_action_menu';
import type {
  SecurityActionMenuContribution,
  SecurityActionMenuItemDefinition,
  SecurityActionMenuPreset,
} from '../../../../../common/components/security_action_menu';

export const ALERT_ACTION_IDS = {
  addToCase: SHARED_ACTION_IDS.addToCase,
  changeAlertStatus: 'changeAlertStatus',
  runWorkflow: SHARED_ACTION_IDS.runWorkflow,
  applyAlertTags: SHARED_ACTION_IDS.applyAlertTags,
  manageAlertAssignees: 'manageAlertAssignees',
  addAlertExceptions: 'addAlertExceptions',
  addEndpointEventFilter: SHARED_ACTION_IDS.addEndpointEventFilter,
  runOsquery: SHARED_ACTION_IDS.runOsquery,
  addToChat: 'addToChat',
} as const;

export type AlertActionId = (typeof ALERT_ACTION_IDS)[keyof typeof ALERT_ACTION_IDS];

const ALERT_ACTION_MENU_ITEM_DEFINITIONS = {
  ...SHARED_ACTION_MENU_ITEM_DEFINITIONS,
  addToChat: {
    icon: 'discuss',
    sourceKeys: ['add-to-chat-action'],
  },
} satisfies Record<string, SecurityActionMenuItemDefinition>;

export const addAlertActionMenuIcons = (
  contributions: Array<SecurityActionMenuContribution<AlertActionId>>
): Array<SecurityActionMenuContribution<AlertActionId>> =>
  contributions.map((contribution) => ({
    ...contribution,
    items: applySecurityActionMenuItemMetadata(
      contribution.items,
      ALERT_ACTION_MENU_ITEM_DEFINITIONS
    ),
  }));

const ALERT_ACTION_GROUPS = {
  cases: 'cases',
  workflow: 'workflow',
  collaboration: 'collaboration',
  exceptions: 'exceptions',
  response: 'response',
  ai: 'ai',
} as const;

type AlertActionGroupId = (typeof ALERT_ACTION_GROUPS)[keyof typeof ALERT_ACTION_GROUPS];

export const ALERTS_TABLE_ROW_ACTION_MENU_PRESET: SecurityActionMenuPreset<
  AlertActionId,
  AlertActionGroupId
> = {
    groups: [
      {
        id: ALERT_ACTION_GROUPS.workflow,
        actionIds: [ALERT_ACTION_IDS.changeAlertStatus],
      },
      {
        id: ALERT_ACTION_GROUPS.collaboration,
        actionIds: [
          ALERT_ACTION_IDS.manageAlertAssignees,
          ALERT_ACTION_IDS.addToCase,
          ALERT_ACTION_IDS.applyAlertTags,
        ],
      },
      {
        id: ALERT_ACTION_GROUPS.exceptions,
        actionIds: [ALERT_ACTION_IDS.addAlertExceptions, ALERT_ACTION_IDS.addEndpointEventFilter],
      },
      {
        id: ALERT_ACTION_GROUPS.response,
        actionIds: [ALERT_ACTION_IDS.runWorkflow, ALERT_ACTION_IDS.runOsquery],
      },
      { id: ALERT_ACTION_GROUPS.ai, actionIds: [ALERT_ACTION_IDS.addToChat] },
    ],
};
