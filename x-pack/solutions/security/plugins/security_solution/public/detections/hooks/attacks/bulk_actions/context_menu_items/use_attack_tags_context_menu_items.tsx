/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';

import { useBulkAttackTagsItems } from '../bulk_action_items/use_bulk_attack_tags_items';
import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '../constants';
import { transformBulkActionsToContextMenuItems } from '../utils/transform_bulk_actions_to_context_menu_items';
import type {
  BaseAttackContextMenuItemsProps,
  AttackWithTags,
  BulkAttackContextMenuItems,
} from '../types';

export interface UseAttackTagsContextMenuItemsProps extends BaseAttackContextMenuItemsProps {
  /** Array of attacks with tags */
  attacksWithTags: AttackWithTags[];
}

/**
 * Hook that provides context menu items and panels for managing tags on attacks.
 * The hook creates mock alert items from the attack IDs and related alert IDs to work with the bulk actions system.
 */
export const useAttackTagsContextMenuItems = ({
  attacksWithTags,
  closePopover,
  clearSelection,
  setIsLoading,
  onSuccess,
  refresh,
}: UseAttackTagsContextMenuItemsProps): BulkAttackContextMenuItems => {
  const bulkActionItems = useBulkAttackTagsItems({
    onTagsUpdate: onSuccess,
  });

  const alertItems = useMemo(() => {
    return attacksWithTags.map((attack) => ({
      _id: attack.attackId,
      data: [
        { field: ALERT_ATTACK_DISCOVERY_ALERT_IDS, value: attack.relatedAlertIds },
        { field: ALERT_WORKFLOW_TAGS, value: attack.tags ?? [] },
      ],
      ecs: { _id: attack.attackId },
    }));
  }, [attacksWithTags]);

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
