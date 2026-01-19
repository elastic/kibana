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
import {
  getEntityExpandItems,
  createEntityExpandInput,
  type EntityExpandItemDescriptor,
} from './get_entity_expand_items';

/**
 * Resolves labels for entity expand item descriptors.
 * Handles i18n translation based on item type and current action.
 */
const resolveEntityItemLabel = (descriptor: EntityExpandItemDescriptor): string => {
  switch (descriptor.type) {
    case 'show-actions-by-entity':
      return descriptor.currentAction === 'show'
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showThisEntitysActions',
            { defaultMessage: "Show this entity's actions" }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideThisEntitysActions',
            { defaultMessage: "Hide this entity's actions" }
          );
    case 'show-actions-on-entity':
      return descriptor.currentAction === 'show'
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showActionsDoneToThisEntity',
            { defaultMessage: 'Show actions done to this entity' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideActionsDoneToThisEntity',
            { defaultMessage: 'Hide actions done to this entity' }
          );
    case 'show-related-events':
      return descriptor.currentAction === 'show'
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showRelatedEntities',
            { defaultMessage: 'Show related events' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideRelatedEntities',
            { defaultMessage: 'Hide related events' }
          );
    case 'show-entity-details':
      return i18n.translate(
        'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityDetails',
        { defaultMessage: 'Show entity details' }
      );
    default:
      return '';
  }
};

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

      // Generate item descriptors using pure function
      const descriptors = getEntityExpandItems(input, (field, value) =>
        containsFilter(searchFilters, field, value)
      );

      if (descriptors.length === 0) {
        return [];
      }

      // Convert descriptors to popover items with labels and click handlers
      const items: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> = [];

      descriptors.forEach((descriptor, index) => {
        // Add separator before entity details item in single-entity mode
        if (descriptor.type === 'show-entity-details' && input.docMode === 'single-entity') {
          items.push({ type: 'separator' });
        }

        const item: ItemExpandPopoverListItemProps = {
          type: 'item',
          iconType: descriptor.iconType,
          testSubject: descriptor.testSubject,
          label: resolveEntityItemLabel(descriptor),
          disabled: descriptor.disabled,
          onClick: () => {
            if (descriptor.type === 'show-entity-details') {
              onShowEntityDetailsClick?.(node);
            } else if (descriptor.field && descriptor.value && descriptor.currentAction) {
              // Handle filter toggle actions
              const action = descriptor.currentAction;
              const field = descriptor.field;
              const value = descriptor.value;

              if (action === 'show') {
                setSearchFilters((prev) => addFilter(dataViewId, prev, field, value));
              } else {
                setSearchFilters((prev) => removeFilter(prev, field, value));
              }
            }
          },
          showToolTip: descriptor.disabled,
          toolTipText: descriptor.disabled
            ? i18n.translate(
                'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityDetailsTooltipText',
                { defaultMessage: 'Details not available' }
              )
            : undefined,
          toolTipProps: descriptor.disabled
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
