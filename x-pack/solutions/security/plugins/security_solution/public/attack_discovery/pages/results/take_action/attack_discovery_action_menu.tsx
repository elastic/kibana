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
  ATTACK_DISCOVERY_STATUS_ICON_COLORS,
} from '../../../../common/utils/action_icons';

interface AttackDiscoveryActionMenuProps {
  aiItems: EuiContextMenuPanelItemDescriptor[];
  caseItems: EuiContextMenuPanelItemDescriptor[];
  datasetItems: EuiContextMenuPanelItemDescriptor[];
  panels: EuiContextMenuPanelDescriptor[];
  statusItems: EuiContextMenuPanelItemDescriptor[];
  workflowItems: EuiContextMenuPanelItemDescriptor[];
}

export const AttackDiscoveryActionMenu = ({
  aiItems,
  caseItems,
  datasetItems,
  panels,
  statusItems,
  workflowItems,
}: AttackDiscoveryActionMenuProps) => {
  const items = useMemo(() => {
    const actionGroups = [
      withStatusDotIcons(statusItems, ATTACK_DISCOVERY_STATUS_ICON_COLORS),
      caseItems,
      workflowItems,
      aiItems,
      datasetItems,
    ].filter((group) => group.length > 0);

    return withActionIcons(withGroupSeparators(actionGroups), ACTION_ICONS_BY_ID);
  }, [aiItems, caseItems, datasetItems, statusItems, workflowItems]);

  return <EuiContextMenu initialPanelId={0} panels={[{ id: 0, items }, ...panels]} />;
};
