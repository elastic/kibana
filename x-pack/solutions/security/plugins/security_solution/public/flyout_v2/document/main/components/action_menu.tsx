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
import type { FlyoutActionType } from '../../../../common/lib/telemetry';
import { FLYOUT_ACTION } from '../../../../common/lib/telemetry';
import {
  getActionMenuGroupSeparator,
  withActionIcon,
  withActionIcons,
  withStatusDotIcons,
} from '../../../../common/utils/action_menu_items';
import type { ReportActionClickedParams } from '../../../shared/hooks/use_flyout_telemetry';
import { wrapActionTelemetry } from '../utils/wrap_action_telemetry';
import { ALERT_EXCEPTION_ACTION_IDS } from '../../../../detections/components/alerts_table/timeline_actions/use_add_exception_actions';
import { ADD_TO_CASE_ACTION_IDS } from '../../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';
import { RUN_ALERT_WORKFLOW_ACTION_ID } from '../../../../detections/components/alerts_table/timeline_actions/use_run_alert_workflow_panel';
import { RUN_DOCUMENT_WORKFLOW_ACTION_ID } from '../../../../detections/components/alerts_table/timeline_actions/use_run_document_workflow_panel';
import { INVESTIGATE_IN_TIMELINE_ACTION_ID } from '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { OSQUERY_ACTION_ID } from '../../../../detections/components/osquery/osquery_action_item';
import { ALERT_TAG_ACTION_ID } from '../../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items';
import { ALERT_ASSIGNEE_ACTION_IDS } from '../../../../common/components/toolbar/bulk_actions/use_bulk_alert_assignees_items';
import { ISOLATE_HOST_ACTION_ID } from '../../../../common/components/endpoint/host_isolation/from_alerts/use_host_isolation_action';
import { RESPOND_ACTION_ID } from '../../../../common/components/endpoint/responder/from_alerts/use_responder_action_item';
import { EXPLORE_ACTION_ID } from '../hooks/use_explore_actions';

interface ActionMenuProps {
  addToCaseItems: EuiContextMenuPanelItemDescriptor[];
  addToCasePanels: EuiContextMenuPanelDescriptor[];
  alertAssigneeItems: EuiContextMenuPanelItemDescriptor[];
  alertAssigneePanels: EuiContextMenuPanelDescriptor[];
  alertTagItems: EuiContextMenuPanelItemDescriptor[];
  alertTagPanels: EuiContextMenuPanelDescriptor[];
  documentWorkflowItems: EuiContextMenuPanelItemDescriptor[];
  endpointResponseItems: EuiContextMenuPanelItemDescriptor[];
  exceptionItems: EuiContextMenuPanelItemDescriptor[];
  exploreItems: EuiContextMenuPanelItemDescriptor[];
  hostIsolationItems: EuiContextMenuPanelItemDescriptor[];
  investigateInTimelineItems: EuiContextMenuPanelItemDescriptor[];
  isAlert: boolean;
  isInSecurityApp: boolean;
  isRemoteDocument: boolean;
  noteItems: EuiContextMenuPanelItemDescriptor[];
  osqueryAvailable: boolean;
  osqueryItems: EuiContextMenuPanelItemDescriptor[];
  reportActionClicked: (params: ReportActionClickedParams) => void;
  runAlertWorkflowItems: EuiContextMenuPanelItemDescriptor[];
  runAlertWorkflowPanels: EuiContextMenuPanelDescriptor[];
  runDocumentWorkflowPanels: EuiContextMenuPanelDescriptor[];
  statusItems: EuiContextMenuPanelItemDescriptor[];
  statusPanels: EuiContextMenuPanelDescriptor[];
}

const FOOTER_ACTIONS_BY_TEST_SUBJ: Partial<Record<string, FlyoutActionType>> = {
  'open-alert-status': FLYOUT_ACTION.STATUS_OPEN,
  'acknowledged-alert-status': FLYOUT_ACTION.STATUS_ACKNOWLEDGED,
  'alert-close-context-menu-item': FLYOUT_ACTION.STATUS_CLOSED,
  'alert-tags-context-menu-item': FLYOUT_ACTION.ADD_TAGS,
  'alert-assignees-context-menu-item': FLYOUT_ACTION.ADD_ASSIGNEES,
  'remove-alert-assignees-menu-item': FLYOUT_ACTION.REMOVE_ASSIGNEES,
  'add-endpoint-exception-menu-item': FLYOUT_ACTION.ADD_ENDPOINT_EXCEPTION,
  'add-exception-menu-item': FLYOUT_ACTION.ADD_RULE_EXCEPTION,
  'isolate-host-action-item': FLYOUT_ACTION.ISOLATE_HOST,
  'run-workflow-action': FLYOUT_ACTION.RUN_WORKFLOW,
  'run-document-workflow-action': FLYOUT_ACTION.RUN_WORKFLOW,
  'endpointResponseActions-action-item': FLYOUT_ACTION.RESPOND,
  'osquery-action-item': FLYOUT_ACTION.RUN_OSQUERY,
  'add-note-action': FLYOUT_ACTION.ADD_NOTE,
  'investigate-in-timeline-action-item': FLYOUT_ACTION.INVESTIGATE_IN_TIMELINE,
  'explore-in-alerts-or-timeline': FLYOUT_ACTION.EXPLORE,
};

const ALERT_STATUS_ICON_COLORS = {
  'acknowledged-alert-status': 'primary',
  'alert-close-context-menu-item': 'subdued',
  'open-alert-status': 'danger',
} as const;

const ACTION_ICONS_BY_ID = {
  [ADD_TO_CASE_ACTION_IDS.addToCase]: 'briefcase',
  [ALERT_ASSIGNEE_ACTION_IDS.assign]: 'users',
  [ALERT_ASSIGNEE_ACTION_IDS.unassignAll]: 'users',
  [ALERT_EXCEPTION_ACTION_IDS.addEndpointException]: 'bullseye',
  [ALERT_EXCEPTION_ACTION_IDS.addRuleException]: 'filter',
  [ALERT_TAG_ACTION_ID]: 'tag',
  [EXPLORE_ACTION_ID]: 'external',
  [INVESTIGATE_IN_TIMELINE_ACTION_ID]: 'timeline',
  [ISOLATE_HOST_ACTION_ID]: 'lock',
  [OSQUERY_ACTION_ID]: 'console',
  [RESPOND_ACTION_ID]: 'bolt',
  [RUN_ALERT_WORKFLOW_ACTION_ID]: 'workflow',
  [RUN_DOCUMENT_WORKFLOW_ACTION_ID]: 'workflow',
} as const;

export const ActionMenu = ({
  addToCaseItems,
  addToCasePanels,
  alertAssigneeItems,
  alertAssigneePanels,
  alertTagItems,
  alertTagPanels,
  documentWorkflowItems,
  endpointResponseItems,
  exceptionItems,
  exploreItems,
  hostIsolationItems,
  investigateInTimelineItems,
  isAlert,
  isInSecurityApp,
  isRemoteDocument,
  noteItems,
  osqueryAvailable,
  osqueryItems,
  reportActionClicked,
  runAlertWorkflowItems,
  runAlertWorkflowPanels,
  runDocumentWorkflowPanels,
  statusItems,
  statusPanels,
}: ActionMenuProps) => {
  const items = useMemo(() => {
    const alertManagementItems = [
      ...(!isRemoteDocument && isAlert ? alertAssigneeItems : []),
      ...(!isRemoteDocument ? addToCaseItems : []),
      ...(!isRemoteDocument && isAlert ? alertTagItems : []),
    ];
    const responseActionItems = !isRemoteDocument
      ? [
          ...(isAlert ? runAlertWorkflowItems : documentWorkflowItems),
          ...(isAlert ? hostIsolationItems : []),
          ...endpointResponseItems,
          ...(osqueryAvailable ? osqueryItems : []),
        ]
      : [];
    const actionGroups = [
      !isRemoteDocument && isAlert ? statusItems : [],
      alertManagementItems,
      !isRemoteDocument && isAlert ? exceptionItems : [],
      responseActionItems,
      !isRemoteDocument && !isAlert ? withActionIcon(noteItems, 'pencil') : [],
      isInSecurityApp ? investigateInTimelineItems : [],
      !isInSecurityApp ? exploreItems : [],
    ].filter((group) => group.length > 0);

    const orderedItems = actionGroups.flatMap((group, index) => [
      ...group,
      ...(index < actionGroups.length - 1
        ? [getActionMenuGroupSeparator(`separator-${index}`)]
        : []),
    ]);

    const decoratedItems = withStatusDotIcons(
      withActionIcons(orderedItems, ACTION_ICONS_BY_ID),
      ALERT_STATUS_ICON_COLORS
    );

    return wrapActionTelemetry(decoratedItems, FOOTER_ACTIONS_BY_TEST_SUBJ, reportActionClicked);
  }, [
    addToCaseItems,
    alertAssigneeItems,
    alertTagItems,
    documentWorkflowItems,
    endpointResponseItems,
    exceptionItems,
    exploreItems,
    hostIsolationItems,
    investigateInTimelineItems,
    isAlert,
    isInSecurityApp,
    isRemoteDocument,
    noteItems,
    osqueryAvailable,
    osqueryItems,
    reportActionClicked,
    runAlertWorkflowItems,
    statusItems,
  ]);

  const panels = useMemo(
    () => [
      ...(!isRemoteDocument ? addToCasePanels : []),
      ...(!isRemoteDocument && isAlert ? statusPanels : []),
      ...(!isRemoteDocument && isAlert ? alertAssigneePanels : []),
      ...(!isRemoteDocument && isAlert ? alertTagPanels : []),
      ...(!isRemoteDocument && isAlert ? runAlertWorkflowPanels : []),
      ...(!isRemoteDocument && !isAlert ? runDocumentWorkflowPanels : []),
    ],
    [
      alertAssigneePanels,
      alertTagPanels,
      addToCasePanels,
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
