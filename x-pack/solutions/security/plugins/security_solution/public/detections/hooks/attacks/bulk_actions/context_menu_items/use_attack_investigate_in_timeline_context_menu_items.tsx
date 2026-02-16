/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useBulkAttackInvestigateInTimelineItems } from '../bulk_action_items/use_bulk_attack_investigate_in_timeline_items';
import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '../constants';
import { transformBulkActionsToContextMenuItems } from '../utils/transform_bulk_actions_to_context_menu_items';
import type {
  AttackWithTimelineAlerts,
  BaseAttackContextMenuItemsProps,
  BulkAttackContextMenuItems,
} from '../types';

export interface UseAttackInvestigateInTimelineContextMenuItemsProps
  extends BaseAttackContextMenuItemsProps {
  /** Array of attacks with alert ids used to investigate in Timeline */
  attacksWithTimelineAlerts: AttackWithTimelineAlerts[];
}

export const useAttackInvestigateInTimelineContextMenuItems = ({
  attacksWithTimelineAlerts,
  closePopover,
  clearSelection,
  setIsLoading,
  refresh,
}: UseAttackInvestigateInTimelineContextMenuItemsProps): BulkAttackContextMenuItems => {
  const bulkActionItems = useBulkAttackInvestigateInTimelineItems({ closePopover });

  const alertItems = useMemo(
    () =>
      attacksWithTimelineAlerts.map((attack) => ({
        _id: attack.attackId,
        data: [{ field: ALERT_ATTACK_DISCOVERY_ALERT_IDS, value: attack.relatedAlertIds }],
        ecs: { _id: attack.attackId },
      })),
    [attacksWithTimelineAlerts]
  );

  const contextMenuItems = useMemo(
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

  return contextMenuItems;
};
