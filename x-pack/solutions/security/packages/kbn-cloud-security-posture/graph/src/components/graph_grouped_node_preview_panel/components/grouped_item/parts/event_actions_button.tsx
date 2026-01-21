/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiPopover, EuiListGroup, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PopoverListItem } from '../../../../popovers/primitives/popover_list_item';
import {
  GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID,
  GROUPED_ITEM_ACTIONS_POPOVER_TEST_ID,
} from '../../../test_ids';
import type { EventItem, AlertItem } from '../types';
import { emitPreviewAction } from '../../../../preview_pub_sub';
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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);

  // Generate items fresh on each render to reflect current filter state
  const items = getLabelExpandItems({
    nodeLabel: item.action ?? '',
    onShowEventDetails: () => emitPreviewAction(item),
    onClose: closePopover,
    enabledItems: {
      showEventsWithAction: true,
      showEventDetails: true,
    },
  });

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="boxesHorizontal"
          aria-label={actionsButtonAriaLabel}
          color="text"
          onClick={togglePopover}
          data-test-subj={GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="rightCenter"
      data-test-subj={GROUPED_ITEM_ACTIONS_POPOVER_TEST_ID}
    >
      <EuiListGroup gutterSize="none" bordered={false} flush={true} size="l">
        {items.map((popoverItem, index) => {
          if (popoverItem.type === 'separator') {
            return <EuiHorizontalRule key={index} margin="none" size="full" />;
          }
          return (
            <PopoverListItem
              key={index}
              iconType={popoverItem.iconType}
              label={popoverItem.label}
              onClick={popoverItem.onClick}
              data-test-subj={popoverItem.testSubject}
            />
          );
        })}
      </EuiListGroup>
    </EuiPopover>
  );
};
