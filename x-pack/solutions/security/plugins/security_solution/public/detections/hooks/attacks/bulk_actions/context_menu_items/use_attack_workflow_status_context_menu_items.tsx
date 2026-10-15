/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useBulkAttackWorkflowStatusItems } from '../bulk_action_items/use_bulk_attack_workflow_status_items';
import { transformBulkActionsToContextMenuItems } from '../utils/transform_bulk_actions_to_context_menu_items';
import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '../constants';
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
 * The current status is the status shared by every attack in the array, or `undefined` when the statuses differ
 * (or any is unknown), in which case all workflow status actions are offered.
 */
export const useAttackWorkflowStatusContextMenuItems = ({
  attacksWithWorkflowStatus,
  closePopover,
  clearSelection,
  setIsLoading,
  onSuccess,
  refresh,
  telemetrySource,
}: UseAttackWorkflowStatusContextMenuItemsProps): BulkAttackContextMenuItems => {
  // The consumer hides the action matching `currentStatus`, so it must only be set when the whole selection
  // is known to share that status. A mixed selection still has attacks that need every transition, and an
  // attack with an unknown status is not known to share anything, so both fall back to `undefined`,
  // which offers all actions. This mirrors alerts, where the status is never guessed from a single row.
  const currentStatus = useMemo(() => {
    const [first] = attacksWithWorkflowStatus;
    if (first?.workflowStatus === undefined) {
      return undefined;
    }
    return attacksWithWorkflowStatus.every(
      ({ workflowStatus }) => workflowStatus === first.workflowStatus
    )
      ? first.workflowStatus
      : undefined;
  }, [attacksWithWorkflowStatus]);

  const bulkActionItems = useBulkAttackWorkflowStatusItems({
    onWorkflowStatusUpdate: onSuccess,
    currentStatus,
    telemetrySource,
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
