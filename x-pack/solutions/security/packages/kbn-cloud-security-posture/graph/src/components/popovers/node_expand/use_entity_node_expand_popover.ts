/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback } from 'react';
import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useNodeExpandPopover } from './use_node_expand_popover';
import type { NodeProps } from '../../types';
import {
  GRAPH_NODE_EXPAND_POPOVER_TEST_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_TOOLTIP_ID,
} from '../../test_ids';
import type {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from '../primitives/list_graph_popover';
import { addFilter, containsFilter, removeFilter } from '../../graph_investigation/search_filters';
import { getEntityExpandItems, createEntityExpandInput } from './get_entity_expand_items';

const DISABLED_TOOLTIP = i18n.translate(
  'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityDetailsTooltipText',
  { defaultMessage: 'Details not available' }
);

/**
 * Hook to handle the entity node expand popover.
 * This hook is used to show the popover when the user clicks on the expand button of an entity node.
 * The popover contains the actions to show/hide the actions by entity, actions on entity, and related entities.
 *
 * @param setSearchFilters - Function to set the search filters.
 * @param dataViewId - The data view id.
 * @param searchFilters - The search filters.
 * @returns The entity node expand popover.
 */
export const useEntityNodeExpandPopover = (
  setSearchFilters: React.Dispatch<React.SetStateAction<Filter[]>>,
  dataViewId: string,
  searchFilters: Filter[],
  onShowEntityDetailsClick?: (node: NodeProps) => void
) => {
  const itemsFn = useCallback(
    (
      node: NodeProps
    ): Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> => {
      // Create input for item generation using node.id (React Flow node id)
      const input = createEntityExpandInput(node.id, node.data, Boolean(onShowEntityDetailsClick));

      // Generate items with labels using pure function
      const popoverItems = getEntityExpandItems(input, (field, value) =>
        containsFilter(searchFilters, field, value)
      );

      if (popoverItems.length === 0) {
        return [];
      }

      // Convert items to popover list items with click handlers
      const items: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> = [];

      popoverItems.forEach((popoverItem) => {
        // Add separator before entity details item in single-entity mode
        if (popoverItem.type === 'show-entity-details' && input.docMode === 'single-entity') {
          items.push({ type: 'separator' });
        }

        const item: ItemExpandPopoverListItemProps = {
          type: 'item',
          iconType: popoverItem.iconType,
          testSubject: popoverItem.testSubject,
          label: popoverItem.label,
          disabled: popoverItem.disabled,
          onClick: () => {
            if (popoverItem.type === 'show-entity-details') {
              onShowEntityDetailsClick?.(node);
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
          showToolTip: popoverItem.disabled,
          toolTipText: popoverItem.disabled ? DISABLED_TOOLTIP : undefined,
          toolTipProps: popoverItem.disabled
            ? {
                position: 'bottom',
                'data-test-subj': GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_TOOLTIP_ID,
              }
            : undefined,
        };

        items.push(item);
      });

      return items;
    },
    [onShowEntityDetailsClick, searchFilters, dataViewId, setSearchFilters]
  );
  const entityNodeExpandPopover = useNodeExpandPopover({
    id: 'entity-node-expand-popover',
    itemsFn,
    testSubject: GRAPH_NODE_EXPAND_POPOVER_TEST_ID,
  });
  return entityNodeExpandPopover;
};
