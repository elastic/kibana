/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiPopover, EuiListGroup, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { PopoverListItem } from '../../../../popovers/primitives/popover_list_item';
import {
  GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID,
  GROUPED_ITEM_ACTIONS_POPOVER_TEST_ID,
} from '../../../test_ids';
import type { EntityItem } from '../types';
import { getEntityExpandItems } from '../../../../popovers/node_expand/get_entity_expand_items';
import { getFilterStore } from '../../../../filters/filter_state';
import { GenericEntityPanelKey, GENERIC_ENTITY_PREVIEW_BANNER } from '../../../constants';

const actionsButtonAriaLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.groupedItem.actionsButton.ariaLabel',
  {
    defaultMessage: 'Actions',
  }
);

export interface EntityActionsButtonProps {
  item: EntityItem;
  /**
   * Unique identifier for the graph instance, used to scope filter state.
   */
  scopeId: string;
}

/**
 * Actions button for entity items in the grouped node preview panel.
 * Shows a popover with filter toggle actions and entity details option.
 * Uses FilterStore (scoped by scopeId) for filter state management.
 * Uses useExpandableFlyoutApi to open entity details preview panel.
 */
export const EntityActionsButton = ({ item, scopeId }: EntityActionsButtonProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { openPreviewPanel } = useExpandableFlyoutApi();

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);

  // Get the FilterStore for this scope to check current filter state
  const filterStore = getFilterStore(scopeId);

  const handleShowEntityDetails = useCallback(() => {
    openPreviewPanel({
      id: GenericEntityPanelKey,
      params: {
        entityId: item.id,
        scopeId,
        isPreviewMode: true,
        banner: GENERIC_ENTITY_PREVIEW_BANNER,
        isEngineMetadataExist: !!item.availableInEntityStore,
      },
    });
  }, [item.id, item.availableInEntityStore, openPreviewPanel, scopeId]);

  // Generate items fresh on each render to reflect current filter state
  const items = getEntityExpandItems({
    nodeId: item.id,
    sourceNamespace: item.ecsParentField,
    onShowEntityDetails: item.availableInEntityStore ? handleShowEntityDetails : undefined,
    onClose: closePopover,
    isFilterActive: (field, value) => filterStore?.isFilterActive(field, value) ?? false,
    toggleFilter: (field, value, action) => filterStore?.toggleFilter(field, value, action),
    shouldRender: {
      showActionsByEntity: true,
      showActionsOnEntity: true,
      showRelatedEvents: true,
      showEntityDetails: !!item.availableInEntityStore,
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
              disabled={popoverItem.disabled}
              data-test-subj={popoverItem.testSubject}
              showToolTip={popoverItem.showToolTip}
              toolTipText={popoverItem.toolTipText}
              toolTipProps={popoverItem.toolTipProps}
            />
          );
        })}
      </EuiListGroup>
    </EuiPopover>
  );
};
