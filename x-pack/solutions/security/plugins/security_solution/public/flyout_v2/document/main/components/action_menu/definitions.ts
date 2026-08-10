/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SHARED_ACTION_IDS,
  SHARED_ACTION_MENU_ITEM_DEFINITIONS,
} from '../../../../../common/components/security_action_menu';
import type {
  SecurityActionMenuDefinition,
  SecurityActionMenuItemDefinition,
  SecurityActionMenuPreset,
  SecurityActionMenuSourceDefinition,
} from '../../../../../common/components/security_action_menu';

export const DOCUMENT_ACTION_IDS = {
  markAsOpen: SHARED_ACTION_IDS.markAsOpen,
  markAsAcknowledged: SHARED_ACTION_IDS.markAsAcknowledged,
  markAsClosed: SHARED_ACTION_IDS.markAsClosed,
  addToExistingCase: SHARED_ACTION_IDS.addToExistingCase,
  addToNewCase: SHARED_ACTION_IDS.addToNewCase,
  applyAlertTags: SHARED_ACTION_IDS.applyAlertTags,
  assignAlert: SHARED_ACTION_IDS.assignAlert,
  unassignAlert: SHARED_ACTION_IDS.unassignAlert,
  addEndpointException: SHARED_ACTION_IDS.addEndpointException,
  addRuleException: SHARED_ACTION_IDS.addRuleException,
  addEndpointEventFilter: SHARED_ACTION_IDS.addEndpointEventFilter,
  isolateHost: 'isolateHost',
  runWorkflow: SHARED_ACTION_IDS.runWorkflow,
  respond: 'respond',
  runOsquery: SHARED_ACTION_IDS.runOsquery,
  addNote: 'addNote',
  investigateInTimeline: SHARED_ACTION_IDS.investigateInTimeline,
  explore: SHARED_ACTION_IDS.explore,
} as const;

export type DocumentActionId = (typeof DOCUMENT_ACTION_IDS)[keyof typeof DOCUMENT_ACTION_IDS];

export const DOCUMENT_ACTION_DEFINITIONS: Record<
  DocumentActionId,
  SecurityActionMenuItemDefinition
> = {
  ...SHARED_ACTION_MENU_ITEM_DEFINITIONS,
  [DOCUMENT_ACTION_IDS.isolateHost]: {
    icon: 'lock',
    sourceKeys: ['isolate-host-action-item'],
  },
  [DOCUMENT_ACTION_IDS.respond]: {
    icon: 'bolt',
    sourceKeys: ['endpointResponseActions-action-item'],
  },
  [DOCUMENT_ACTION_IDS.addNote]: {
    icon: 'pencil',
    sourceKeys: ['add-note-action'],
  },
};

const DOCUMENT_ACTION_SOURCES = {
  addToCase: {
    actionIds: [DOCUMENT_ACTION_IDS.addToExistingCase, DOCUMENT_ACTION_IDS.addToNewCase],
  },
  changeStatus: {
    actionIds: [
      DOCUMENT_ACTION_IDS.markAsOpen,
      DOCUMENT_ACTION_IDS.markAsAcknowledged,
      DOCUMENT_ACTION_IDS.markAsClosed,
    ],
  },
  applyAlertTags: { actionIds: [DOCUMENT_ACTION_IDS.applyAlertTags] },
  manageAlertAssignees: {
    actionIds: [DOCUMENT_ACTION_IDS.assignAlert, DOCUMENT_ACTION_IDS.unassignAlert],
  },
  addExceptions: {
    actionIds: [DOCUMENT_ACTION_IDS.addEndpointException, DOCUMENT_ACTION_IDS.addRuleException],
  },
  addEndpointEventFilter: { actionIds: [DOCUMENT_ACTION_IDS.addEndpointEventFilter] },
  isolateHost: { actionIds: [DOCUMENT_ACTION_IDS.isolateHost] },
  runAlertWorkflow: { actionIds: [DOCUMENT_ACTION_IDS.runWorkflow] },
  runDocumentWorkflow: { actionIds: [DOCUMENT_ACTION_IDS.runWorkflow] },
  respond: { actionIds: [DOCUMENT_ACTION_IDS.respond] },
  runOsquery: { actionIds: [DOCUMENT_ACTION_IDS.runOsquery] },
  addNote: { actionIds: [DOCUMENT_ACTION_IDS.addNote] },
  investigateInTimeline: { actionIds: [DOCUMENT_ACTION_IDS.investigateInTimeline] },
  explore: { actionIds: [DOCUMENT_ACTION_IDS.explore] },
} as const satisfies Record<string, SecurityActionMenuSourceDefinition<DocumentActionId>>;

type DocumentActionSourceId = keyof typeof DOCUMENT_ACTION_SOURCES;

export const DOCUMENT_FLYOUT_ACTION_MENU_DEFINITION: SecurityActionMenuDefinition<
  DocumentActionId,
  DocumentActionSourceId
> = {
  actions: DOCUMENT_ACTION_DEFINITIONS,
  sources: DOCUMENT_ACTION_SOURCES,
};

const DOCUMENT_ACTION_GROUPS = {
  cases: 'cases',
  alertManagement: 'alertManagement',
  exceptions: 'exceptions',
  isolation: 'isolation',
  workflow: 'workflow',
  response: 'response',
  investigation: 'investigation',
} as const;

type DocumentActionGroupId = (typeof DOCUMENT_ACTION_GROUPS)[keyof typeof DOCUMENT_ACTION_GROUPS];

export const DOCUMENT_FLYOUT_ACTION_MENU_PRESET: SecurityActionMenuPreset<
  DocumentActionId,
  DocumentActionGroupId
> = {
  groups: [
    {
      id: DOCUMENT_ACTION_GROUPS.cases,
      actionIds: [DOCUMENT_ACTION_IDS.addToExistingCase, DOCUMENT_ACTION_IDS.addToNewCase],
    },
    {
      id: DOCUMENT_ACTION_GROUPS.alertManagement,
      actionIds: [
        DOCUMENT_ACTION_IDS.markAsOpen,
        DOCUMENT_ACTION_IDS.markAsAcknowledged,
        DOCUMENT_ACTION_IDS.markAsClosed,
        DOCUMENT_ACTION_IDS.applyAlertTags,
        DOCUMENT_ACTION_IDS.assignAlert,
        DOCUMENT_ACTION_IDS.unassignAlert,
      ],
    },
    {
      id: DOCUMENT_ACTION_GROUPS.exceptions,
      actionIds: [
        DOCUMENT_ACTION_IDS.addEndpointException,
        DOCUMENT_ACTION_IDS.addRuleException,
        DOCUMENT_ACTION_IDS.addEndpointEventFilter,
      ],
    },
    {
      id: DOCUMENT_ACTION_GROUPS.isolation,
      actionIds: [DOCUMENT_ACTION_IDS.isolateHost],
    },
    {
      id: DOCUMENT_ACTION_GROUPS.workflow,
      actionIds: [DOCUMENT_ACTION_IDS.runWorkflow],
    },
    {
      id: DOCUMENT_ACTION_GROUPS.response,
      actionIds: [DOCUMENT_ACTION_IDS.respond, DOCUMENT_ACTION_IDS.runOsquery],
    },
    {
      id: DOCUMENT_ACTION_GROUPS.investigation,
      actionIds: [
        DOCUMENT_ACTION_IDS.addNote,
        DOCUMENT_ACTION_IDS.investigateInTimeline,
        DOCUMENT_ACTION_IDS.explore,
      ],
    },
  ],
};
