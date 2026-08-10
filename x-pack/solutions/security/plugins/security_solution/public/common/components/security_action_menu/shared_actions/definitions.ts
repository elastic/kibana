/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconProps, IconType } from '@elastic/eui';
import { SHARED_ACTION_IDS } from './ids';

export interface SecurityActionMenuItemDefinition {
  readonly icon?: IconType;
  readonly iconColor?: EuiIconProps['color'];
  readonly sourceKeys: readonly string[];
}

/**
 * Reusable definitions for leaf actions shared by multiple Security Solution menus.
 * Consumers remain responsible for selecting actions and defining their own groups and order.
 */
export const SHARED_ACTION_MENU_ITEM_DEFINITIONS = {
  [SHARED_ACTION_IDS.markAsOpen]: {
    icon: 'dot',
    iconColor: 'danger',
    sourceKeys: ['open', 'open-alert-status'],
  },
  [SHARED_ACTION_IDS.markAsAcknowledged]: {
    icon: 'dot',
    iconColor: 'primary',
    sourceKeys: ['acknowledge', 'acknowledged-alert-status'],
  },
  [SHARED_ACTION_IDS.markAsClosed]: {
    icon: 'dot',
    iconColor: 'subdued',
    sourceKeys: ['close-alert-with-reason', 'alert-close-context-menu-item'],
  },
  [SHARED_ACTION_IDS.addToExistingCase]: {
    icon: 'briefcase',
    sourceKeys: ['add-to-existing-case-action'],
  },
  [SHARED_ACTION_IDS.addToNewCase]: {
    icon: 'briefcase',
    sourceKeys: ['add-to-new-case-action'],
  },
  [SHARED_ACTION_IDS.applyAlertTags]: {
    icon: 'tag',
    sourceKeys: ['manage-alert-tags', 'alert-tags-context-menu-item'],
  },
  [SHARED_ACTION_IDS.assignAlert]: {
    icon: 'users',
    sourceKeys: ['manage-alert-assignees', 'alert-assignees-context-menu-item'],
  },
  [SHARED_ACTION_IDS.unassignAlert]: {
    icon: 'users',
    sourceKeys: ['remove-all-alert-assignees', 'remove-alert-assignees-menu-item'],
  },
  [SHARED_ACTION_IDS.addEndpointException]: {
    icon: 'bullseye',
    sourceKeys: ['add-endpoint-exception-menu-item'],
  },
  [SHARED_ACTION_IDS.addRuleException]: {
    icon: 'filter',
    sourceKeys: ['add-exception-menu-item'],
  },
  [SHARED_ACTION_IDS.addEndpointEventFilter]: {
    icon: 'filter',
    sourceKeys: ['add-event-filter-menu-item'],
  },
  [SHARED_ACTION_IDS.runWorkflow]: {
    icon: 'workflow',
    sourceKeys: ['run-workflow-action', 'run-document-workflow-action'],
  },
  [SHARED_ACTION_IDS.runOsquery]: {
    icon: 'console',
    sourceKeys: ['osquery-action-item'],
  },
  [SHARED_ACTION_IDS.investigateInTimeline]: {
    icon: 'timeline',
    sourceKeys: ['investigate-in-timeline-action-item'],
  },
  [SHARED_ACTION_IDS.explore]: {
    icon: 'external',
    sourceKeys: ['explore-action', 'explore-in-alerts-or-timeline'],
  },
} as const satisfies Record<string, SecurityActionMenuItemDefinition>;
