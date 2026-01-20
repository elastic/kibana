/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useNodeExpandPopover } from './use_node_expand_popover';
import type { NodeProps } from '../../types';
import { GRAPH_LABEL_EXPAND_POPOVER_TEST_ID } from '../../test_ids';
import type {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from '../primitives/list_graph_popover';
import { useFilterState } from '../../graph_investigation/filter_state';
import { emitFilterAction } from '../../graph_investigation/filter_actions';
import { getLabelExpandItems, createLabelExpandInput } from './get_label_expand_items';

/**
 * Hook to handle the label node expand popover.
 * This hook is used to show the popover when the user clicks on the expand button of a label node.
 * The popover contains the actions to show/hide the events with this action.
 *
 * Uses pub-sub pattern for filter state management - reads from filterState$ and emits to filterAction$.
 *
 * @param onShowEventDetailsClick - Optional callback when event details is clicked.
 * @returns The label node expand popover.
 */
export const useLabelNodeExpandPopover = (onShowEventDetailsClick?: (node: NodeProps) => void) => {
  const { isFilterActive } = useFilterState();

  const itemsFn = useCallback(
    (
      node: NodeProps
    ): Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> => {
      // Create input for item generation
      const input = createLabelExpandInput(node.data);

      // Generate items with labels using pure function
      const popoverItems = getLabelExpandItems(
        input,
        isFilterActive,
        Boolean(onShowEventDetailsClick)
      );

      if (popoverItems.length === 0) {
        return [];
      }

      // Convert items to popover list items with click handlers
      // Separators are passed through as-is, action items get onClick handlers
      return popoverItems.map(
        (popoverItem): ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps => {
          if (popoverItem.type === 'separator') {
            return popoverItem;
          }

          return {
            type: 'item',
            iconType: popoverItem.iconType,
            testSubject: popoverItem.testSubject,
            label: popoverItem.label,
            onClick: () => {
              if (popoverItem.type === 'show-event-details') {
                onShowEventDetailsClick?.(node);
              } else if (
                popoverItem.field &&
                popoverItem.value &&
                popoverItem.currentAction &&
                popoverItem.filterActionType
              ) {
                // Emit filter action via pub-sub
                emitFilterAction({
                  type: popoverItem.filterActionType,
                  field: popoverItem.field,
                  value: popoverItem.value,
                  action: popoverItem.currentAction,
                });
              }
            },
          };
        }
      );
    },
    [onShowEventDetailsClick, isFilterActive]
  );

  const labelNodeExpandPopover = useNodeExpandPopover({
    id: 'label-node-expand-popover',
    testSubject: GRAPH_LABEL_EXPAND_POPOVER_TEST_ID,
    itemsFn,
  });

  return labelNodeExpandPopover;
};
