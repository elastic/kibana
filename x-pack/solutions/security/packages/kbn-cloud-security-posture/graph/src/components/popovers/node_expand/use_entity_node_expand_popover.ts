/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
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
import { useFilterState } from '../../graph_investigation/filter_state';
import { emitFilterAction } from '../../graph_investigation/filter_actions';
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
 * Uses pub-sub pattern for filter state management - reads from filterState$ and emits to filterAction$.
 *
 * @param onShowEntityDetailsClick - Optional callback when entity details is clicked.
 * @returns The entity node expand popover.
 */
export const useEntityNodeExpandPopover = (
  onShowEntityDetailsClick?: (node: NodeProps) => void
) => {
  const { isFilterActive } = useFilterState();

  const itemsFn = useCallback(
    (
      node: NodeProps
    ): Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> => {
      // Create input for item generation using node.id (React Flow node id)
      const input = createEntityExpandInput(node.id, node.data, Boolean(onShowEntityDetailsClick));

      // Generate items with labels using pure function
      const popoverItems = getEntityExpandItems(input, isFilterActive);

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
            disabled: popoverItem.disabled,
            onClick: () => {
              if (popoverItem.type === 'show-entity-details') {
                onShowEntityDetailsClick?.(node);
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
            showToolTip: popoverItem.disabled,
            toolTipText: popoverItem.disabled ? DISABLED_TOOLTIP : undefined,
            toolTipProps: popoverItem.disabled
              ? {
                  position: 'bottom',
                  'data-test-subj': GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_TOOLTIP_ID,
                }
              : undefined,
          };
        }
      );
    },
    [onShowEntityDetailsClick, isFilterActive]
  );
  const entityNodeExpandPopover = useNodeExpandPopover({
    id: 'entity-node-expand-popover',
    itemsFn,
    testSubject: GRAPH_NODE_EXPAND_POPOVER_TEST_ID,
  });
  return entityNodeExpandPopover;
};
