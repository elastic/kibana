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
import {
  getActionMenuGroupSeparator,
  withActionIcon,
  withActionIcons,
  withStatusDotIcons,
} from '../../../../common/utils/action_menu_items';
import { ATTACK_ADD_TO_CASE_ACTION_ID } from '../../../hooks/attacks/bulk_actions/bulk_action_items/use_bulk_attack_case_items';
import { ATTACK_TAG_ACTION_ID } from '../../../hooks/attacks/bulk_actions/bulk_action_items/use_bulk_attack_tags_items';
import { ATTACK_ASSIGNEE_ACTION_IDS } from '../../../hooks/attacks/bulk_actions/bulk_action_items/use_bulk_attack_assignees_items';
import { RUN_ATTACK_WORKFLOW_ACTION_ID } from '../../../hooks/attacks/bulk_actions/bulk_action_items/use_bulk_attack_run_workflow_items';
import { ATTACK_INVESTIGATE_IN_TIMELINE_ACTION_ID } from '../../../hooks/attacks/bulk_actions/bulk_action_items/use_bulk_attack_investigate_in_timeline_items';
import { ATTACK_AI_ACTION_IDS } from '../../../hooks/attacks/bulk_actions/context_menu_items/use_attack_view_in_ai_assistant_context_menu_items';
import { EXPLORE_IN_ATTACKS_ACTION_ID } from '../../../hooks/attacks/bulk_actions/context_menu_items/use_attack_explore_in_attacks_context_menu_items';

interface AttacksActionMenuProps {
  assigneeItems: EuiContextMenuPanelItemDescriptor[];
  assigneePanels: EuiContextMenuPanelDescriptor[];
  caseItems: EuiContextMenuPanelItemDescriptor[];
  casePanels: EuiContextMenuPanelDescriptor[];
  datasetItems: EuiContextMenuPanelItemDescriptor[];
  isRemoteDocument: boolean;
  navigationItems: EuiContextMenuPanelItemDescriptor[];
  runWorkflowItems: EuiContextMenuPanelItemDescriptor[];
  runWorkflowPanels: EuiContextMenuPanelDescriptor[];
  showAiAssistantAction: boolean;
  statusItems: EuiContextMenuPanelItemDescriptor[];
  statusPanels: EuiContextMenuPanelDescriptor[];
  tagItems: EuiContextMenuPanelItemDescriptor[];
  tagPanels: EuiContextMenuPanelDescriptor[];
  viewInAiAssistantItems: EuiContextMenuPanelItemDescriptor[];
}

const ATTACK_STATUS_ICON_COLORS = {
  'acknowledged-attack-status': 'primary',
  'open-attack-status': 'danger',
} as const;

const ACTION_ICONS_BY_ID = {
  [ATTACK_AI_ACTION_IDS.addToChat]: 'comment',
  [ATTACK_AI_ACTION_IDS.viewInAiAssistant]: 'sparkles',
  [ATTACK_ASSIGNEE_ACTION_IDS.assign]: 'users',
  [ATTACK_ASSIGNEE_ACTION_IDS.unassignAll]: 'users',
  [ATTACK_ADD_TO_CASE_ACTION_ID]: 'briefcase',
  [ATTACK_INVESTIGATE_IN_TIMELINE_ACTION_ID]: 'timeline',
  [ATTACK_TAG_ACTION_ID]: 'tag',
  [EXPLORE_IN_ATTACKS_ACTION_ID]: 'external',
  [RUN_ATTACK_WORKFLOW_ACTION_ID]: 'workflow',
} as const;

export const AttacksActionMenu = ({
  assigneeItems,
  assigneePanels,
  caseItems,
  casePanels,
  datasetItems,
  isRemoteDocument,
  navigationItems,
  runWorkflowItems,
  runWorkflowPanels,
  showAiAssistantAction,
  statusItems,
  statusPanels,
  tagItems,
  tagPanels,
  viewInAiAssistantItems,
}: AttacksActionMenuProps) => {
  const items = useMemo(() => {
    const navigationActionItems = withActionIcons(navigationItems, ACTION_ICONS_BY_ID);

    if (isRemoteDocument) {
      return navigationActionItems;
    }

    const attackManagementItems = [...assigneeItems, ...caseItems, ...tagItems];
    const actionGroups = [
      withStatusDotIcons(statusItems, ATTACK_STATUS_ICON_COLORS, 'subdued'),
      attackManagementItems,
      runWorkflowItems,
      showAiAssistantAction ? viewInAiAssistantItems : [],
      withActionIcon(datasetItems, 'database'),
      navigationActionItems,
    ].filter((group) => group.length > 0);

    return withActionIcons(
      actionGroups.flatMap((group, index) => [
        ...group,
        ...(index < actionGroups.length - 1
          ? [getActionMenuGroupSeparator(`separator-${index}`)]
          : []),
      ]),
      ACTION_ICONS_BY_ID
    );
  }, [
    assigneeItems,
    caseItems,
    datasetItems,
    isRemoteDocument,
    navigationItems,
    runWorkflowItems,
    showAiAssistantAction,
    statusItems,
    tagItems,
    viewInAiAssistantItems,
  ]);

  const panels = useMemo(
    () =>
      isRemoteDocument
        ? []
        : [...casePanels, ...runWorkflowPanels, ...statusPanels, ...assigneePanels, ...tagPanels],
    [assigneePanels, casePanels, isRemoteDocument, runWorkflowPanels, statusPanels, tagPanels]
  );

  return <EuiContextMenu initialPanelId={0} panels={[{ id: 0, items }, ...panels]} />;
};
