/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';

import { useBulkAttackAssigneesItems } from '../bulk_action_items/use_bulk_attack_assignees_items';
import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '../constants';
import { transformBulkActionsToContextMenuItems } from '../utils/transform_bulk_actions_to_context_menu_items';
import type {
  BaseAttackContextMenuItemsProps,
  AttackWithAssignees,
  BulkAttackContextMenuItems,
} from '../types';

export interface UseAttackAssigneesContextMenuItemsProps extends BaseAttackContextMenuItemsProps {
  /** Array of attacks with assignees */
  attacksWithAssignees: AttackWithAssignees[];
}

/**
 * Hook that provides context menu items and panels for managing assignees on attacks.
 * The hook creates mock alert items from the attack IDs and related alert IDs to work with the bulk actions system.
 */
export const useAttackAssigneesContextMenuItems = ({
  attacksWithAssignees,
  closePopover,
  clearSelection,
  setIsLoading,
  onSuccess,
  refresh,
}: UseAttackAssigneesContextMenuItemsProps): BulkAttackContextMenuItems => {
  // Get all unique assignees from all attacks for the bulk hook
  const allAssignees = useMemo(() => {
    const assigneeSet = new Set<string>();
    attacksWithAssignees.forEach((attack) => {
      attack.assignees?.forEach((assignee) => assigneeSet.add(assignee));
    });
    return Array.from(assigneeSet);
  }, [attacksWithAssignees]);

  const bulkActionItems = useBulkAttackAssigneesItems({
    onAssigneesUpdate: onSuccess,
    alertAssignments: allAssignees,
  });

  const alertItems = useMemo(() => {
    return attacksWithAssignees.map((attack) => ({
      _id: attack.attackId,
      data: [
        { field: ALERT_ATTACK_DISCOVERY_ALERT_IDS, value: attack.relatedAlertIds },
        { field: ALERT_WORKFLOW_ASSIGNEE_IDS, value: attack.assignees ?? [] },
      ],
      ecs: { _id: attack.attackId },
    }));
  }, [attacksWithAssignees]);

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
