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
  withActionIcons,
  withGroupSeparators,
  withStatusDotIcons,
} from '../../../../common/utils/action_menu_items';
import {
  ACTION_ICONS_BY_ID,
  ATTACK_STATUS_ICON_COLORS,
} from '../../../../common/utils/action_icons';

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
      withStatusDotIcons(statusItems, ATTACK_STATUS_ICON_COLORS),
      attackManagementItems,
      runWorkflowItems,
      showAiAssistantAction ? viewInAiAssistantItems : [],
      datasetItems,
      navigationActionItems,
    ].filter((group) => group.length > 0);

    return withActionIcons(withGroupSeparators(actionGroups), ACTION_ICONS_BY_ID);
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
