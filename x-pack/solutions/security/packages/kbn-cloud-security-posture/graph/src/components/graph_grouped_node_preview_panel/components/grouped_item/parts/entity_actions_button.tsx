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
import type { EntityItem } from '../types';
import {
  getEntityExpandItems,
  fieldForRole,
} from '../../../../popovers/node_expand/get_entity_expand_items';
import type { EntityFilterActions } from '../../../../popovers/node_expand/get_entity_expand_items';
import {
  emitFilterToggle,
  isFilterActiveForScope,
  emitEntityRelationshipToggle,
  isEntityRelationshipExpandedForScope,
} from '../../../../filters/filter_store';
import { RELATED_ENTITY } from '../../../../../common/constants';
import { useOpenEntityPreviewPanel } from '../../../hooks/use_open_entity_preview_panel';

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
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);

  const openEntityPreviewPanel = useOpenEntityPreviewPanel();
  const sourceFields = item.entity.sourceFields ?? {};

  const entityFilterActions: EntityFilterActions = {
    toggleEntityFilter: (role, action) => {
      for (const [field, value] of Object.entries(sourceFields)) {
        // Flatten string | string[] to string[] so each value gets its own OR'd phrase filter
        for (const v of ([] as string[]).concat(value)) {
          emitFilterToggle(scopeId, fieldForRole(field, role), v, action);
        }
      }
    },
    isEntityFilterActive: (role) =>
      Object.entries(sourceFields).some(([field, value]) =>
        ([] as string[])
          .concat(value)
          .some((v) => isFilterActiveForScope(scopeId, fieldForRole(field, role), v))
      ),
    toggleRelatedEvents: (action) => emitFilterToggle(scopeId, RELATED_ENTITY, item.id, action),
    isRelatedEventsActive: () => isFilterActiveForScope(scopeId, RELATED_ENTITY, item.id),
  };

  // Generate items fresh on each render to reflect current filter state
  const items = getEntityExpandItems({
    nodeId: item.id,
    entityFilterActions,
    onShowEntityDetails: () => openEntityPreviewPanel(item.id, scopeId, item.entity),
    onClose: closePopover,
    shouldRender: {
      showEntityRelationships: true,
      showActionsByEntity: true,
      showActionsOnEntity: true,
      showRelatedEvents: true,
      showEntityDetails: true,
    },
    showEntityDetailsDisabled: !item.entity.availableInEntityStore,
    isEntityRelationshipsExpanded: isEntityRelationshipExpandedForScope(scopeId, item.id),
    toggleEntityRelationships: (action) => emitEntityRelationshipToggle(scopeId, item.id, action),
    showEntityRelationshipsDisabled: !item.entity.availableInEntityStore,
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
