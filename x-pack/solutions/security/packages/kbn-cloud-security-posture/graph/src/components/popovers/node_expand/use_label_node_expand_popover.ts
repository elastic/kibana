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
import { GRAPH_LABEL_EXPAND_POPOVER_TEST_ID } from '../../test_ids';
import type {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from '../primitives/list_graph_popover';
import { addFilter, containsFilter, removeFilter } from '../../graph_investigation/search_filters';
import {
  getLabelExpandItems,
  createLabelExpandInput,
  type LabelExpandItemDescriptor,
} from './get_label_expand_items';

/**
 * Resolves labels for label expand item descriptors.
 * Handles i18n translation based on item type and current action.
 */
const resolveLabelItemLabel = (descriptor: LabelExpandItemDescriptor): string => {
  switch (descriptor.type) {
    case 'show-events-with-action':
      return descriptor.currentAction === 'show'
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showRelatedEvents',
            { defaultMessage: 'Show related events' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphLabelExpandPopover.hideRelatedEvents',
            { defaultMessage: 'Hide related events' }
          );
    case 'show-event-details':
      return descriptor.docMode === 'single-alert'
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showAlertDetails',
            { defaultMessage: 'Show alert details' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showEventDetails',
            { defaultMessage: 'Show event details' }
          );
    default:
      return '';
  }
};

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

      // Generate item descriptors using pure function
      const descriptors = getLabelExpandItems(
        input,
        (field, value) => containsFilter(searchFilters, field, value),
        Boolean(onShowEventDetailsClick)
      );

      if (descriptors.length === 0) {
        return [];
      }

      // Convert descriptors to popover items with labels and click handlers
      const items: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> = [];

      descriptors.forEach((descriptor, index) => {
        // Add separator before event details item
        if (descriptor.type === 'show-event-details' && index > 0) {
          items.push({ type: 'separator' });
        }

        const item: ItemExpandPopoverListItemProps = {
          type: 'item',
          iconType: descriptor.iconType,
          testSubject: descriptor.testSubject,
          label: resolveLabelItemLabel(descriptor),
          onClick: () => {
            if (descriptor.type === 'show-event-details') {
              onShowEventDetailsClick?.(node);
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
