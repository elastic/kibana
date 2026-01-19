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
import type { ItemExpandPopoverListItemProps } from '../../../../popovers/primitives/list_graph_popover';
import {
  GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID,
  GROUPED_ITEM_ACTIONS_POPOVER_TEST_ID,
} from '../../../test_ids';
import type { EntityItem } from '../types';
import { useFilterState } from '../../../../graph_investigation/filter_state';
import { emitFilterAction } from '../../../../graph_investigation/filter_actions';
import { emitGroupedItemClick } from '../../../events';
import {
  getEntityExpandItems,
  type EntityExpandInput,
} from '../../../../popovers/node_expand/get_entity_expand_items';

const actionsButtonAriaLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.groupedItem.actionsButton.ariaLabel',
  {
    defaultMessage: 'Actions',
  }
);

export interface EntityActionsButtonProps {
  item: EntityItem;
}

/**
 * Actions button for entity items in the grouped node preview panel.
 * Shows a popover with filter toggle actions and entity details option.
 * Emits filter actions via pub-sub for GraphInvestigation to handle.
 * Emits grouped item click via pub-sub for entity details.
 */
export const EntityActionsButton = ({ item }: EntityActionsButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const { state, actions } = useGraphPopoverState('grouped-item-entity-actions-popover');
  const { isFilterActive } = useFilterState();

  const handleClick = useCallback(() => {
    if (buttonRef.current) {
      actions.openPopover(buttonRef.current);
    }
  }, [actions]);

  // Create input for item generation - treat as single-entity since we're in flyout
  const input: EntityExpandInput = useMemo(
    () => ({
      id: item.id,
      docMode: 'single-entity', // In flyout, we treat entities as single
      actorField: 'entity.id', // Default field - could be extended based on item.type
      targetField: 'entity.target.id',
      entityDetailsDisabled: false, // Entity details always enabled in flyout
    }),
    [item.id]
  );

  // Generate items with labels
  const popoverItems = useMemo(
    () => getEntityExpandItems(input, isFilterActive),
    [input, isFilterActive]
  );

  // Convert items to popover list items
  const items: ItemExpandPopoverListItemProps[] = useMemo(() => {
    return popoverItems.map((popoverItem) => ({
      type: 'item' as const,
      iconType: popoverItem.iconType,
      testSubject: popoverItem.testSubject,
      label: popoverItem.label,
      disabled: popoverItem.disabled,
      onClick: () => {
        if (popoverItem.type === 'show-entity-details') {
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
    }));
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
