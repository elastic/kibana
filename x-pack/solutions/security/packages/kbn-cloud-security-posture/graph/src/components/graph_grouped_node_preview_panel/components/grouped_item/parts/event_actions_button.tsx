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
import { emitGroupedItemClick } from '../../../events';
import {
  getLabelExpandItems,
  type LabelExpandInput,
} from '../../../../popovers/node_expand/get_label_expand_items';

const actionsButtonAriaLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.groupedItem.actionsButton.ariaLabel',
  {
    defaultMessage: 'Actions',
  }
);

export interface EventActionsButtonProps {
  item: EventItem | AlertItem;
}

/**
 * Actions button for event/alert items in the grouped node preview panel.
 * Shows a popover with filter toggle actions and event details option.
 * Emits filter actions via pub-sub for GraphInvestigation to handle.
 * Emits grouped item click via pub-sub for event/alert details.
 */
export const EventActionsButton = ({ item }: EventActionsButtonProps) => {
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

  // Generate items with labels - always enable event details in flyout
  const popoverItems = useMemo(
    () => getLabelExpandItems(input, isFilterActive, true),
    [input, isFilterActive]
  );

  // Convert items to popover list items
  // Separators are passed through as-is, action items get onClick handlers
  const items: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> =
    useMemo(() => {
      return popoverItems.map(
        (popoverItem): ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps => {
          if (popoverItem.type === 'separator') {
            return popoverItem;
          }

          return {
            type: 'item' as const,
            iconType: popoverItem.iconType,
            testSubject: popoverItem.testSubject,
            label: popoverItem.label,
            onClick: () => {
              if (popoverItem.type === 'show-event-details') {
                emitGroupedItemClick(item);
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
              actions.closePopover();
            },
          };
        }
      );
    }, [popoverItems, item, actions]);

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
