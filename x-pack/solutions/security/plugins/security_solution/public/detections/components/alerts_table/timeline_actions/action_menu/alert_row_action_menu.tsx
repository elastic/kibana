/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu } from '@elastic/eui';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { ALERT_EXCEPTION_ACTION_IDS } from '../use_add_exception_actions';
import {
  getActionMenuGroupSeparator,
  withActionIcons,
  withStatusDotIcons,
} from '../../../../../common/utils/action_menu_items';
import { ALERT_TAG_ACTION_ID } from '../../../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items';
import { ALERT_ASSIGNEE_ACTION_IDS } from '../../../../../common/components/toolbar/bulk_actions/use_bulk_alert_assignees_items';
import { OSQUERY_ACTION_ID } from '../../../osquery/osquery_action_item';
import { ADD_TO_CASE_ACTION_IDS } from '../use_add_to_case_actions';
import { ADD_TO_CHAT_ACTION_ID } from '../use_add_to_chat_action';
import { EVENT_FILTER_ACTION_ID } from '../use_event_filter_action';
import { RUN_ALERT_WORKFLOW_ACTION_ID } from '../use_run_alert_workflow_panel';
import { RUN_DOCUMENT_WORKFLOW_ACTION_ID } from '../use_run_document_workflow_panel';

interface AlertRowActionMenuProps {
  addToCaseItems: EuiContextMenuPanelItemDescriptor[];
  addToChatItems: EuiContextMenuPanelItemDescriptor[];
  alertAssigneeItems: EuiContextMenuPanelItemDescriptor[];
  alertTagItems: EuiContextMenuPanelItemDescriptor[];
  canCreateEndpointEventFilters: boolean;
  eventFilterItems: EuiContextMenuPanelItemDescriptor[];
  exceptionItems: EuiContextMenuPanelItemDescriptor[];
  hasAgent: boolean;
  isAlert: boolean;
  osqueryItems: EuiContextMenuPanelItemDescriptor[];
  panels: EuiContextMenuPanelDescriptor[];
  runAlertWorkflowItems: EuiContextMenuPanelItemDescriptor[];
  runDocumentWorkflowItems: EuiContextMenuPanelItemDescriptor[];
  statusItems: EuiContextMenuPanelItemDescriptor[];
}

const ALERT_STATUS_ICON_COLORS = {
  'acknowledged-alert-status': 'primary',
  'alert-close-context-menu-item': 'subdued',
  'open-alert-status': 'danger',
} as const;

const ACTION_ICONS_BY_ID = {
  [ADD_TO_CASE_ACTION_IDS.addToCase]: 'briefcase',
  [ADD_TO_CHAT_ACTION_ID]: 'comment',
  [ALERT_ASSIGNEE_ACTION_IDS.assign]: 'users',
  [ALERT_ASSIGNEE_ACTION_IDS.unassignAll]: 'users',
  [ALERT_EXCEPTION_ACTION_IDS.addEndpointException]: 'bullseye',
  [ALERT_EXCEPTION_ACTION_IDS.addRuleException]: 'filter',
  [ALERT_TAG_ACTION_ID]: 'tag',
  [EVENT_FILTER_ACTION_ID]: 'filter',
  [OSQUERY_ACTION_ID]: 'console',
  [RUN_ALERT_WORKFLOW_ACTION_ID]: 'workflow',
  [RUN_DOCUMENT_WORKFLOW_ACTION_ID]: 'workflow',
} as const;

export const AlertRowActionMenu = ({
  addToCaseItems,
  addToChatItems,
  alertAssigneeItems,
  alertTagItems,
  canCreateEndpointEventFilters,
  eventFilterItems,
  exceptionItems,
  hasAgent,
  isAlert,
  osqueryItems,
  panels,
  runAlertWorkflowItems,
  runDocumentWorkflowItems,
  statusItems,
}: AlertRowActionMenuProps) => {
  const items = useMemo(() => {
    const alertManagementItems = [...alertAssigneeItems, ...addToCaseItems, ...alertTagItems];
    const responseActionItems = [
      ...(isAlert ? runAlertWorkflowItems : runDocumentWorkflowItems),
      ...(hasAgent ? osqueryItems : []),
    ];
    const actionGroups = isAlert
      ? [statusItems, alertManagementItems, exceptionItems, responseActionItems, addToChatItems]
      : [
          addToCaseItems,
          canCreateEndpointEventFilters ? eventFilterItems : [],
          responseActionItems,
        ];
    const visibleActionGroups = actionGroups.filter((group) => group.length > 0);

    const orderedItems = visibleActionGroups.flatMap((group, index) => [
      ...group,
      ...(index < visibleActionGroups.length - 1
        ? [getActionMenuGroupSeparator(`separator-${index}`)]
        : []),
    ]);

    return withStatusDotIcons(
      withActionIcons(orderedItems, ACTION_ICONS_BY_ID),
      ALERT_STATUS_ICON_COLORS
    );
  }, [
    addToCaseItems,
    addToChatItems,
    alertAssigneeItems,
    alertTagItems,
    canCreateEndpointEventFilters,
    eventFilterItems,
    exceptionItems,
    hasAgent,
    isAlert,
    osqueryItems,
    runAlertWorkflowItems,
    runDocumentWorkflowItems,
    statusItems,
  ]);

  return (
    <EuiContextMenu
      initialPanelId={0}
      panels={[{ id: 0, items }, ...panels]}
      data-test-subj="actions-context-menu"
    />
  );
};
