/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiListGroup,
  EuiHorizontalRule,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PopoverListItem } from '../../../../popovers/primitives/popover_list_item';
import {
  GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID,
  GROUPED_ITEM_ACTIONS_POPOVER_TEST_ID,
} from '../../../test_ids';
import type { EntityItem } from '../types';
import {
  getEntityExpandItems,
  getEntityFilterSpec,
  toggleEntityFilterSpec,
  isEntityFilterSpecActive,
  getRelatedEventsFilter,
} from '../../../../popovers/node_expand/get_entity_expand_items';
import type {
  EntityFilterActions,
  EuidFilterApi,
} from '../../../../popovers/node_expand/get_entity_expand_items';
import {
  emitFilterToggle,
  emitIsOneOfFilterToggle,
  isFilterActiveForScope,
  emitEntityRelationshipToggle,
  isEntityRelationshipExpandedForScope,
  emitPinnedEuidToggle,
} from '../../../../filters/filter_store';

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
  /**
   * Whether this entity is the initial/origin entity of the graph investigation.
   * When true, "hide entity relationships" is disabled because the origin entity's
   * relationships are always shown and cannot be hidden from the grouped panel.
   */
  isInitialEntity?: boolean;
  /** Invoked to open the entity details preview for the clicked item. */
  onShowEntity: (params: {
    engineType: string | undefined;
    entityId: string;
    entityName: string | undefined;
  }) => void;
  /**
   * EUID API used to narrow entity filters to the highest-ranking identity fields.
   * Async-hydrated by the consumer; until it resolves, filters fall back to the
   * unnarrowed sourceFields.
   */
  euidApi?: EuidFilterApi;
}

/**
 * Actions button for entity items in the grouped node preview panel.
 * Shows a popover with filter toggle actions and entity details option.
 * Uses FilterStore (scoped by scopeId) for filter state management.
 * Delegates opening the entity details preview to the consumer via `onShowEntity`.
 */
export const EntityActionsButton = ({
  item,
  scopeId,
  isInitialEntity = false,
  onShowEntity,
  euidApi,
}: EntityActionsButtonProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);

  const sourceFields = (item.entity.sourceFields ?? {}) as Record<string, string | string[]>;
  const engineType = item.entity.engine_type;

  // Entity filters come from the Entity Store's EUID logic as a boolean KQL expression
  // (ranked identity field + higher-ranked-field guards + namespace clause), falling back to
  // the identity sourceFields until the EUID API's lazy chunk has loaded.
  const specByRole = {
    actor: getEntityFilterSpec(item.id, sourceFields, euidApi, 'actor'),
    target: getEntityFilterSpec(item.id, sourceFields, euidApi, 'target'),
  } as const;
  const filterKey = (role: 'actor' | 'target') => `${item.id}|${role}`;

  const entityFilterActions: EntityFilterActions = {
    toggleEntityFilter: (role, action) => {
      const spec = specByRole[role];
      if (!spec) return;
      toggleEntityFilterSpec(scopeId, filterKey(role), spec, role, action);

      if (action === 'show') {
        emitPinnedEuidToggle(scopeId, item.id, 'show');
      } else {
        // Only unpin when no entity filter remains active for either role
        const hasRemainingFilters = (['actor', 'target'] as const).some((r) => {
          const roleSpec = specByRole[r];
          return roleSpec != null && isEntityFilterSpecActive(scopeId, filterKey(r), roleSpec, r);
        });
        if (!hasRemainingFilters) {
          emitPinnedEuidToggle(scopeId, item.id, 'hide');
        }
      }
    },
    isEntityFilterActive: (role) => {
      const spec = specByRole[role];
      return spec != null && isEntityFilterSpecActive(scopeId, filterKey(role), spec, role);
    },
    toggleRelatedEvents: (action) => {
      const related = getRelatedEventsFilter(item.id, sourceFields, engineType);
      if (!related) return;
      if (related.values.length === 1) {
        emitFilterToggle(scopeId, related.field, related.values[0], action);
      } else {
        emitIsOneOfFilterToggle(scopeId, related.field, related.values, action);
      }
    },
    isRelatedEventsActive: () => {
      const related = getRelatedEventsFilter(item.id, sourceFields, engineType);
      if (!related) return false;
      return isFilterActiveForScope(scopeId, related.field, related.values);
    },
  };

  // Generate items fresh on each render to reflect current filter state
  const items = getEntityExpandItems({
    nodeId: item.id,
    entityFilterActions,
    onShowEntityDetails: () =>
      onShowEntity({ engineType, entityId: item.id, entityName: item.entity.name }),
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
    toggleEntityRelationships: (action) => {
      emitEntityRelationshipToggle(scopeId, item.id, action);
      // Pin the entity when showing relationships so it appears as a solo node
      // rather than merging back into its type-group. Unpin when hiding.
      emitPinnedEuidToggle(scopeId, item.id, action);
    },
    showEntityRelationshipsDisabled: !item.entity.availableInEntityStore || isInitialEntity,
  });

  return (
    <EuiPopover
      aria-label={actionsButtonAriaLabel}
      button={
        <EuiToolTip content={actionsButtonAriaLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="boxesVertical"
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
