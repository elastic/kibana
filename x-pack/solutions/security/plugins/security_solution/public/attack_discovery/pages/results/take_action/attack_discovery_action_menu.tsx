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
  withActionIcons,
} from '../../../../common/utils/action_menu_items';
import { RUN_ATTACK_WORKFLOW_ACTION_ID } from '../../../../detections/hooks/attacks/bulk_actions/bulk_action_items/use_bulk_attack_run_workflow_items';

interface AttackDiscoveryActionMenuProps {
  aiItems: EuiContextMenuPanelItemDescriptor[];
  caseItems: EuiContextMenuPanelItemDescriptor[];
  datasetItems: EuiContextMenuPanelItemDescriptor[];
  panels: EuiContextMenuPanelDescriptor[];
  statusItems: EuiContextMenuPanelItemDescriptor[];
  workflowItems: EuiContextMenuPanelItemDescriptor[];
}

const ACTION_ICONS_BY_ID = {
  [RUN_ATTACK_WORKFLOW_ACTION_ID]: 'workflow',
} as const;

export const AttackDiscoveryActionMenu = ({
  aiItems,
  caseItems,
  datasetItems,
  panels,
  statusItems,
  workflowItems,
}: AttackDiscoveryActionMenuProps) => {
  const items = useMemo(() => {
    const actionGroups = [statusItems, workflowItems, caseItems, aiItems, datasetItems].filter(
      (group) => group.length > 0
    );

    return withActionIcons(
      actionGroups.flatMap((group, index) => [
        ...group,
        ...(index < actionGroups.length - 1
          ? [getActionMenuGroupSeparator(`separator-${index}`)]
          : []),
      ]),
      ACTION_ICONS_BY_ID
    );
  }, [aiItems, caseItems, datasetItems, statusItems, workflowItems]);

  return <EuiContextMenu initialPanelId={0} panels={[{ id: 0, items }, ...panels]} />;
};
