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
import { ALERT_EXCEPTION_ACTION_IDS } from '../../../../detections/components/alerts_table/timeline_actions/use_add_exception_actions';
import {
  getActionMenuGroupSeparator,
  withActionIcons,
  withStatusDotIcons,
} from '../../../../common/utils/action_menu_items';
import { ALERT_STATUS_ICON_COLORS } from '../../../../common/components/toolbar/bulk_actions/use_bulk_action_items';
import { ADD_TO_CASE_ACTION_IDS } from '../../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';
import { EVENT_FILTER_ACTION_ID } from '../../../../detections/components/alerts_table/timeline_actions/use_event_filter_action';
import { RUN_ALERT_WORKFLOW_ACTION_ID } from '../../../../detections/components/alerts_table/timeline_actions/use_run_alert_workflow_panel';
import { RUN_DOCUMENT_WORKFLOW_ACTION_ID } from '../../../../detections/components/alerts_table/timeline_actions/use_run_document_workflow_panel';
import { INVESTIGATE_IN_TIMELINE_ACTION_ID } from '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { OSQUERY_ACTION_ID } from '../../../../detections/components/osquery/osquery_action_item';
import { ALERT_TAG_ACTION_ID } from '../../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items';
import { ALERT_ASSIGNEE_ACTION_IDS } from '../../../../common/components/toolbar/bulk_actions/use_bulk_alert_assignees_items';
import { ISOLATE_HOST_ACTION_ID } from '../../../../common/components/endpoint/host_isolation/from_alerts/use_host_isolation_action';
import { RESPOND_ACTION_ID } from '../../../../common/components/endpoint/responder/from_alerts/use_responder_action_item';

interface DocumentDetailsActionMenuProps {
  addToCaseItems: EuiContextMenuPanelItemDescriptor[];
  alertAssigneeItems: EuiContextMenuPanelItemDescriptor[];
  alertAssigneePanels: EuiContextMenuPanelDescriptor[];
  alertTagItems: EuiContextMenuPanelItemDescriptor[];
  alertTagPanels: EuiContextMenuPanelDescriptor[];
  documentWorkflowItems: EuiContextMenuPanelItemDescriptor[];
  endpointResponseItems: EuiContextMenuPanelItemDescriptor[];
  eventFilterItems: EuiContextMenuPanelItemDescriptor[];
  exceptionItems: EuiContextMenuPanelItemDescriptor[];
  hostIsolationItems: EuiContextMenuPanelItemDescriptor[];
  investigateInTimelineItems: EuiContextMenuPanelItemDescriptor[];
  isAlert: boolean;
  isRemoteDocument: boolean;
  osqueryAvailable: boolean;
  osqueryItems: EuiContextMenuPanelItemDescriptor[];
  runAlertWorkflowItems: EuiContextMenuPanelItemDescriptor[];
  runAlertWorkflowPanels: EuiContextMenuPanelDescriptor[];
  runDocumentWorkflowPanels: EuiContextMenuPanelDescriptor[];
  showAlertActions: boolean;
  showEventFilter: boolean;
  statusItems: EuiContextMenuPanelItemDescriptor[];
  statusPanels: EuiContextMenuPanelDescriptor[];
}

const ACTION_ICONS_BY_ID = {
  [ADD_TO_CASE_ACTION_IDS.addToCase]: 'briefcase',
  [ALERT_ASSIGNEE_ACTION_IDS.assign]: 'users',
  [ALERT_ASSIGNEE_ACTION_IDS.unassignAll]: 'users',
  [ALERT_EXCEPTION_ACTION_IDS.addEndpointException]: 'bullseye',
  [ALERT_EXCEPTION_ACTION_IDS.addRuleException]: 'filter',
  [ALERT_TAG_ACTION_ID]: 'tag',
  [EVENT_FILTER_ACTION_ID]: 'filter',
  [INVESTIGATE_IN_TIMELINE_ACTION_ID]: 'timeline',
  [ISOLATE_HOST_ACTION_ID]: 'lock',
  [OSQUERY_ACTION_ID]: 'console',
  [RESPOND_ACTION_ID]: 'bolt',
  [RUN_ALERT_WORKFLOW_ACTION_ID]: 'workflow',
  [RUN_DOCUMENT_WORKFLOW_ACTION_ID]: 'workflow',
} as const;

export const DocumentDetailsActionMenu = ({
  addToCaseItems,
  alertAssigneeItems,
  alertAssigneePanels,
  alertTagItems,
  alertTagPanels,
  documentWorkflowItems,
  endpointResponseItems,
  eventFilterItems,
  exceptionItems,
  hostIsolationItems,
  investigateInTimelineItems,
  isAlert,
  isRemoteDocument,
  osqueryAvailable,
  osqueryItems,
  runAlertWorkflowItems,
  runAlertWorkflowPanels,
  runDocumentWorkflowPanels,
  showAlertActions,
  showEventFilter,
  statusItems,
  statusPanels,
}: DocumentDetailsActionMenuProps) => {
  const items = useMemo(() => {
    if (isRemoteDocument) {
      return withActionIcons(investigateInTimelineItems, ACTION_ICONS_BY_ID);
    }

    const alertManagementItems = [
      ...(showAlertActions ? alertAssigneeItems : []),
      ...addToCaseItems,
      ...(showAlertActions ? alertTagItems : []),
    ];
    const exceptionActionItems = showAlertActions
      ? exceptionItems
      : showEventFilter
      ? eventFilterItems
      : [];
    const responseActionItems = [
      ...(isAlert ? runAlertWorkflowItems : documentWorkflowItems),
      ...hostIsolationItems,
      ...endpointResponseItems,
      ...(osqueryAvailable ? osqueryItems : []),
    ];
    const actionGroups = [
      showAlertActions ? withStatusDotIcons(statusItems, ALERT_STATUS_ICON_COLORS) : [],
      alertManagementItems,
      exceptionActionItems,
      responseActionItems,
      investigateInTimelineItems,
    ].filter((group) => group.length > 0);

    const orderedItems = actionGroups.flatMap((group, index) => [
      ...group,
      ...(index < actionGroups.length - 1
        ? [getActionMenuGroupSeparator(`separator-${index}`)]
        : []),
    ]);

    return withActionIcons(orderedItems, ACTION_ICONS_BY_ID);
  }, [
    addToCaseItems,
    alertAssigneeItems,
    alertTagItems,
    documentWorkflowItems,
    endpointResponseItems,
    eventFilterItems,
    exceptionItems,
    hostIsolationItems,
    investigateInTimelineItems,
    isAlert,
    isRemoteDocument,
    osqueryAvailable,
    osqueryItems,
    runAlertWorkflowItems,
    showAlertActions,
    showEventFilter,
    statusItems,
  ]);

  const panels = useMemo(
    () => [
      ...(!isRemoteDocument ? alertTagPanels : []),
      ...(!isRemoteDocument ? (isAlert ? runAlertWorkflowPanels : runDocumentWorkflowPanels) : []),
      ...(!isRemoteDocument ? alertAssigneePanels : []),
      ...(!isRemoteDocument ? statusPanels : []),
    ],
    [
      alertAssigneePanels,
      alertTagPanels,
      isAlert,
      isRemoteDocument,
      runAlertWorkflowPanels,
      runDocumentWorkflowPanels,
      statusPanels,
    ]
  );

  return (
    <EuiContextMenu
      initialPanelId={0}
      panels={[{ id: 0, items }, ...panels]}
      data-test-subj="takeActionPanelMenu"
    />
  );
};
