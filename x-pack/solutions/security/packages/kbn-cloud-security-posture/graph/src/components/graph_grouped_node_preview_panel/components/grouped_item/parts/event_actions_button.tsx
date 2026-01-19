/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useMemo } from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useGraphPopoverState } from '../../../../popovers/primitives/use_graph_popover_state';
import { ListGraphPopover } from '../../../../popovers/primitives/list_graph_popover';
import type {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from '../../../../popovers/primitives/list_graph_popover';
import {
  GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID,
  GROUPED_ITEM_ACTIONS_POPOVER_TEST_ID,
} from '../../../test_ids';
import type { EventItem, AlertItem } from '../types';
import { useFilterState } from '../../../../graph_investigation/filter_state';
import { emitFilterAction } from '../../../../graph_investigation/filter_actions';
import {
  getLabelExpandItems,
  type LabelExpandInput,
  type LabelExpandItemDescriptor,
} from '../../../../popovers/node_expand/get_label_expand_items';

const actionsButtonAriaLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.groupedItem.actionsButton.ariaLabel',
  {
    defaultMessage: 'Actions',
  }
);

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

export interface EventActionsButtonProps {
  item: EventItem | AlertItem;
  /**
   * Callback when "show event/alert details" is clicked.
   * If not provided, the event details action will not be shown.
   */
  onShowEventDetails?: (item: EventItem | AlertItem) => void;
}

/**
 * Actions button for event/alert items in the grouped node preview panel.
 * Shows a popover with filter toggle actions and event details option.
 * Emits filter actions via pub-sub for GraphInvestigation to handle.
 */
export const EventActionsButton = ({ item, onShowEventDetails }: EventActionsButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const { state, actions } = useGraphPopoverState('grouped-item-event-actions-popover');
  const { isFilterActive } = useFilterState();

  const handleClick = useCallback(() => {
    if (buttonRef.current) {
      actions.openPopover(buttonRef.current);
    }
  }, [actions]);

  // Create input for item generation
  const input: LabelExpandInput = useMemo(
    () => ({
      label: item.action ?? '',
      docMode: item.itemType === 'alert' ? 'single-alert' : 'single-event', // In flyout, treat as single
    }),
    [item.action, item.itemType]
  );

  // Generate item descriptors
  const descriptors = useMemo(
    () => getLabelExpandItems(input, isFilterActive, Boolean(onShowEventDetails)),
    [input, isFilterActive, onShowEventDetails]
  );

  // Convert descriptors to popover items
  const items: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> =
    useMemo(() => {
      const result: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> =
        [];

      descriptors.forEach((descriptor, index) => {
        // Add separator before event details item
        if (descriptor.type === 'show-event-details' && index > 0) {
          result.push({ type: 'separator' });
        }

        result.push({
          type: 'item' as const,
          iconType: descriptor.iconType,
          testSubject: descriptor.testSubject,
          label: resolveLabelItemLabel(descriptor),
          onClick: () => {
            if (descriptor.type === 'show-event-details') {
              onShowEventDetails?.(item);
            } else if (
              descriptor.field &&
              descriptor.value &&
              descriptor.currentAction &&
              descriptor.filterActionType
            ) {
              // Emit filter action via pub-sub
              emitFilterAction({
                type: descriptor.filterActionType,
                field: descriptor.field,
                value: descriptor.value,
                action: descriptor.currentAction,
              });
            }
            actions.closePopover();
          },
        });
      });

      return result;
    }, [descriptors, item, onShowEventDetails, actions]);

  return (
    <>
      <EuiButtonIcon
        buttonRef={buttonRef}
        iconType="boxesVertical"
        aria-label={actionsButtonAriaLabel}
        color="text"
        onClick={handleClick}
        data-test-subj={GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID}
      />
      <ListGraphPopover
        isOpen={state.isOpen}
        anchorElement={state.anchorElement}
        closePopover={actions.closePopover}
        items={items}
        testSubject={GROUPED_ITEM_ACTIONS_POPOVER_TEST_ID}
      />
    </>
  );
};
