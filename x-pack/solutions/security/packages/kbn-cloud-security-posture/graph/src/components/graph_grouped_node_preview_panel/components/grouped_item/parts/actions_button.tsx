/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useGraphPopoverState } from '../../../../popovers/primitives/use_graph_popover_state';
import { ListGraphPopover } from '../../../../popovers/primitives/list_graph_popover';
import {
  GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID,
  GROUPED_ITEM_ACTIONS_POPOVER_TEST_ID,
} from '../../../test_ids';
import type { EntityOrEventItem } from '../types';

const actionsButtonAriaLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.groupedItem.actionsButton.ariaLabel',
  {
    defaultMessage: 'Actions',
  }
);

export interface ActionsButtonProps {
  item: EntityOrEventItem;
}

export const ActionsButton = ({ item }: ActionsButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const { state, actions } = useGraphPopoverState('grouped-item-actions-popover');

  const handleClick = useCallback(() => {
    if (buttonRef.current) {
      actions.openPopover(buttonRef.current);
    }
  }, [actions]);

  // TODO: Populate items based on item.itemType in upcoming PR
  // - entity items → getEntityExpandItems()
  // - event/alert items → getLabelExpandItems()
  const items: [] = [];

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
