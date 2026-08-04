/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiListGroup,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DOCUMENT_TYPE_ALERT,
  DOCUMENT_TYPE_EVENT,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { PopoverListItem } from '../../../../popovers/primitives/popover_list_item';
import {
  GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID,
  GROUPED_ITEM_ACTIONS_POPOVER_TEST_ID,
} from '../../../test_ids';
import type { EventItem, AlertItem } from '../types';
import { getLabelExpandItems } from '../../../../popovers/node_expand/get_label_expand_items';
import { emitFilterToggle, isFilterActiveForScope } from '../../../../filters/filter_store';

const actionsButtonAriaLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.groupedItem.actionsButton.ariaLabel',
  {
    defaultMessage: 'Actions',
  }
);

export interface EventActionsButtonProps {
  item: EventItem | AlertItem;
  /**
   * Unique identifier for the graph instance, used to scope filter state.
   */
  scopeId: string;
  /** Invoked to open the event/alert details preview for the clicked item. */
  onShowDocument: (docId: string, indexName?: string, isEvent?: boolean) => void;
}

/**
 * Actions button for event/alert items in the grouped node preview panel.
 * Shows a popover with filter toggle actions and event details option.
 * Uses FilterStore (scoped by scopeId) for filter state management.
 * Delegates opening the event/alert details preview to the consumer via `onShowDocument`.
 */
export const EventActionsButton = ({ item, scopeId, onShowDocument }: EventActionsButtonProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);

  const handleShowEventDetails = useCallback(() => {
    if (item.docId) {
      onShowDocument(item.docId, item.index, item.itemType === DOCUMENT_TYPE_EVENT);
    }
  }, [item, onShowDocument]);

  // Generate items fresh on each render to reflect current filter state
  const items = getLabelExpandItems({
    nodeLabel: item.action ?? '',
    onShowEventDetails: handleShowEventDetails,
    onClose: closePopover,
    isFilterActive: (field, value) => isFilterActiveForScope(scopeId, field, value),
    toggleFilter: (field, value, action) => emitFilterToggle(scopeId, field, value, action),
    shouldRender: {
      showEventsWithAction: true,
      showEventDetails: true,
    },
    isSingleAlert: item.itemType === DOCUMENT_TYPE_ALERT,
  });

  return (
    <EuiPopover
      aria-label={actionsButtonAriaLabel}
      button={
        <EuiToolTip content={actionsButtonAriaLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="boxesHorizontal"
            aria-label={actionsButtonAriaLabel}
            color="text"
            onClick={togglePopover}
            data-test-subj={GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID}
          />
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="rightCenter"
      data-test-subj={GROUPED_ITEM_ACTIONS_POPOVER_TEST_ID}
    >
      <EuiListGroup bordered={false}>
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
