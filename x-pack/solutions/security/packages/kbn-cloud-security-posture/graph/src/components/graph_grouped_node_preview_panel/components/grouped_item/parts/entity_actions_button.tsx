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
import {
  getEntityExpandItems,
  type EntityExpandInput,
  type EntityExpandItemDescriptor,
} from '../../../../popovers/node_expand/get_entity_expand_items';

const actionsButtonAriaLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.groupedItem.actionsButton.ariaLabel',
  {
    defaultMessage: 'Actions',
  }
);

/**
 * Resolves labels for entity expand item descriptors.
 * Handles i18n translation based on item type and current action.
 */
const resolveEntityItemLabel = (descriptor: EntityExpandItemDescriptor): string => {
  switch (descriptor.type) {
    case 'show-actions-by-entity':
      return descriptor.currentAction === 'show'
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showThisEntitysActions',
            { defaultMessage: "Show this entity's actions" }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideThisEntitysActions',
            { defaultMessage: "Hide this entity's actions" }
          );
    case 'show-actions-on-entity':
      return descriptor.currentAction === 'show'
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showActionsDoneToThisEntity',
            { defaultMessage: 'Show actions done to this entity' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideActionsDoneToThisEntity',
            { defaultMessage: 'Hide actions done to this entity' }
          );
    case 'show-related-events':
      return descriptor.currentAction === 'show'
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showRelatedEntities',
            { defaultMessage: 'Show related events' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideRelatedEntities',
            { defaultMessage: 'Hide related events' }
          );
    case 'show-entity-details':
      return i18n.translate(
        'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityDetails',
        { defaultMessage: 'Show entity details' }
      );
    default:
      return '';
  }
};

export interface EntityActionsButtonProps {
  item: EntityItem;
  /**
   * Callback when "show entity details" is clicked.
   * If not provided, the entity details action will be disabled.
   */
  onShowEntityDetails?: (item: EntityItem) => void;
}

/**
 * Actions button for entity items in the grouped node preview panel.
 * Shows a popover with filter toggle actions and entity details option.
 * Emits filter actions via pub-sub for GraphInvestigation to handle.
 */
export const EntityActionsButton = ({ item, onShowEntityDetails }: EntityActionsButtonProps) => {
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
      entityDetailsDisabled: !onShowEntityDetails,
    }),
    [item.id, onShowEntityDetails]
  );

  // Generate item descriptors
  const descriptors = useMemo(
    () => getEntityExpandItems(input, isFilterActive),
    [input, isFilterActive]
  );

  // Convert descriptors to popover items
  const items: ItemExpandPopoverListItemProps[] = useMemo(() => {
    return descriptors.map((descriptor) => ({
      type: 'item' as const,
      iconType: descriptor.iconType,
      testSubject: descriptor.testSubject,
      label: resolveEntityItemLabel(descriptor),
      disabled: descriptor.disabled,
      onClick: () => {
        if (descriptor.type === 'show-entity-details') {
          onShowEntityDetails?.(item);
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
    }));
  }, [descriptors, item, onShowEntityDetails, actions]);

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
