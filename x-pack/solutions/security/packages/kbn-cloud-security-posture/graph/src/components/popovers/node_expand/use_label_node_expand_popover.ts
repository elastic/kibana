/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback } from 'react';
import type { Filter } from '@kbn/es-query';
import { useNodeExpandPopover } from './use_node_expand_popover';
import type { NodeProps } from '../../types';
import { GRAPH_LABEL_EXPAND_POPOVER_TEST_ID } from '../../test_ids';
import type {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from '../primitives/list_graph_popover';
import { addFilter, containsFilter, removeFilter } from '../../graph_investigation/search_filters';
import { getLabelExpandItems, createLabelExpandInput } from './get_label_expand_items';

/**
 * Hook to handle the label node expand popover.
 * This hook is used to show the popover when the user clicks on the expand button of a label node.
 * The popover contains the actions to show/hide the events with this action.
 *
 * @param setSearchFilters - Function to set the search filters.
 * @param dataViewId - The data view id.
 * @param searchFilters - The search filters.
 * @returns The label node expand popover.
 */
export const useLabelNodeExpandPopover = (
  setSearchFilters: React.Dispatch<React.SetStateAction<Filter[]>>,
  dataViewId: string,
  searchFilters: Filter[],
  onShowEventDetailsClick?: (node: NodeProps) => void
) => {
  const itemsFn = useCallback(
    (
      node: NodeProps
    ): Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> => {
      // Create input for item generation
      const input = createLabelExpandInput(node.data);

      // Generate items with labels using pure function
      const popoverItems = getLabelExpandItems(
        input,
        (field, value) => containsFilter(searchFilters, field, value),
        Boolean(onShowEventDetailsClick)
      );

      if (popoverItems.length === 0) {
        return [];
      }

      // Convert items to popover list items with click handlers
      const items: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> = [];

      popoverItems.forEach((popoverItem, index) => {
        // Add separator before event details item
        if (popoverItem.type === 'show-event-details' && index > 0) {
          items.push({ type: 'separator' });
        }

        const item: ItemExpandPopoverListItemProps = {
          type: 'item',
          iconType: popoverItem.iconType,
          testSubject: popoverItem.testSubject,
          label: popoverItem.label,
          onClick: () => {
            if (popoverItem.type === 'show-event-details') {
              onShowEventDetailsClick?.(node);
            } else if (popoverItem.field && popoverItem.value && popoverItem.currentAction) {
              // Handle filter toggle actions
              const action = popoverItem.currentAction;
              const field = popoverItem.field;
              const value = popoverItem.value;

              if (action === 'show') {
                setSearchFilters((prev) => addFilter(dataViewId, prev, field, value));
              } else {
                setSearchFilters((prev) => removeFilter(prev, field, value));
              }
            }
          },
        };

        items.push(item);
      });

      return items;
    },
    [onShowEventDetailsClick, searchFilters, dataViewId, setSearchFilters]
  );

  const labelNodeExpandPopover = useNodeExpandPopover({
    id: 'label-node-expand-popover',
    testSubject: GRAPH_LABEL_EXPAND_POPOVER_TEST_ID,
    itemsFn,
  });

  return labelNodeExpandPopover;
};
