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
import {
  GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID,
  GROUPED_ITEM_ACTIONS_POPOVER_TEST_ID,
} from '../../../test_ids';
import type { EventItem, AlertItem } from '../types';
import { isFilterActive } from '../../../../filters/filter_state';
import { getLabelExpandItems } from '../../../../popovers/node_expand/get_label_expand_items';

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

  const handleClick = useCallback(() => {
    if (buttonRef.current) {
      actions.openPopover(buttonRef.current);
    }
  }, [actions]);

  // Generate items with onClick handlers directly
  const items = useMemo(
    () =>
      getLabelExpandItems({
        nodeLabel: item.action ?? '',
        isFilterActive,
        previewItem: item,
        onClose: actions.closePopover,
      }),
    [item, actions.closePopover]
  );

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
