/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useBulkAttackRunWorkflowItems } from '../bulk_action_items/use_bulk_attack_run_workflow_items';
import { transformBulkActionsToContextMenuItems } from '../utils/transform_bulk_actions_to_context_menu_items';
import type {
  BaseAttackContextMenuItemsProps,
  BaseAttackProps,
  BulkAttackContextMenuItems,
} from '../types';

export interface UseAttackRunWorkflowContextMenuItemsProps
  extends Omit<BaseAttackContextMenuItemsProps, 'telemetrySource'> {
  /** Attacks to run the workflow against. Each must have an index to be eligible. */
  attacksForWorkflowRun: Omit<BaseAttackProps, 'relatedAlertIds'>[];
}

export const useAttackRunWorkflowContextMenuItems = ({
  attacksForWorkflowRun,
  closePopover,
}: UseAttackRunWorkflowContextMenuItemsProps): BulkAttackContextMenuItems => {
  const attacksWithIndex = useMemo(
    () => attacksForWorkflowRun.filter((attack) => Boolean(attack.attackIndex)),
    [attacksForWorkflowRun]
  );

  // This menu is the single-attack surface (a table row or the attack flyout), so a run against
  // exactly one attack is recorded with a singular origin. That is what lets the case activity
  // entry name the attack and render the button that reopens its flyout.
  const originAttackId = attacksWithIndex.length === 1 ? attacksWithIndex[0].attackId : undefined;

  const bulkActionItems = useBulkAttackRunWorkflowItems({ originAttackId });

  const attackItems = useMemo(
    () =>
      attacksWithIndex.map((attack) => ({
        _id: attack.attackId,
        data: [],
        ecs: { _id: attack.attackId, _index: attack.attackIndex },
      })),
    [attacksWithIndex]
  );

  return useMemo(
    () =>
      attacksWithIndex.length > 0
        ? transformBulkActionsToContextMenuItems({
            bulkActionItems,
            alertItems: attackItems,
            closePopover,
          })
        : { items: [], panels: [] },
    [attacksWithIndex.length, bulkActionItems, attackItems, closePopover]
  );
};
