/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useBulkAttackWorkflowStatusItems } from '../bulk_action_items/use_bulk_attack_workflow_status_items';
import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '../constants';
import { transformBulkActionsToContextMenuItems } from '../utils/transform_bulk_actions_to_context_menu_items';
import type {
  BaseAttackContextMenuItemsProps,
  AttackWithWorkflowStatus,
  BulkAttackContextMenuItems,
} from '../types';

export interface UseAttackWorkflowStatusContextMenuItemsProps
  extends BaseAttackContextMenuItemsProps {
  /** Array of attacks with workflow status */
  attacksWithWorkflowStatus: AttackWithWorkflowStatus[];
}

/**
 * Hook that provides context menu items and panels for managing workflow status on attacks.
 * The hook creates mock alert items from the attack IDs and related alert IDs to work with the bulk actions system.
 * Uses the workflow status of the first attack in the array to determine the current status for bulk actions.
 */
export const useAttackWorkflowStatusContextMenuItems = ({
  attacksWithWorkflowStatus,
  closePopover,
  clearSelection,
  setIsLoading,
  onSuccess,
  refresh,
}: UseAttackWorkflowStatusContextMenuItemsProps): BulkAttackContextMenuItems => {
  // Use the workflow status of the first attack in the array
  const currentStatus = useMemo(() => {
    return attacksWithWorkflowStatus[0]?.workflowStatus;
  }, [attacksWithWorkflowStatus]);

  const bulkActionItems = useBulkAttackWorkflowStatusItems({
    onWorkflowStatusUpdate: onSuccess,
    currentStatus,
  });

  const alertItems = useMemo(() => {
    return attacksWithWorkflowStatus.map((attack) => ({
      _id: attack.attackId,
      data: [{ field: ALERT_ATTACK_DISCOVERY_ALERT_IDS, value: attack.relatedAlertIds }],
      ecs: { _id: attack.attackId },
    }));
  }, [attacksWithWorkflowStatus]);

  return useMemo(
    () =>
      transformBulkActionsToContextMenuItems({
        bulkActionItems,
        alertItems,
        closePopover,
        clearSelection,
        setIsLoading,
        refresh,
      }),
    [bulkActionItems, alertItems, closePopover, clearSelection, setIsLoading, refresh]
  );
};
