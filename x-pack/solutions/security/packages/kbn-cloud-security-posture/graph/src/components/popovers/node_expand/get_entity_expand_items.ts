/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from '../primitives/list_graph_popover';
import type { NodeViewModel } from '../../types';
import {
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_TOOLTIP_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_TOOLTIP_ID,
} from '../../test_ids';

/**
 * Extracts the entity type from a node ID (EUID).
 * EUID format: "user:...", "host:...", "service:...", or no prefix for generic entities.
 */
export const getEntityTypeFromNodeId = (nodeId: string): string => {
  const colonIndex = nodeId.indexOf(':');
  return colonIndex === -1 ? 'entity' : nodeId.substring(0, colonIndex);
};

/**
 * Transforms a field name to the correct namespace for the given role.
 * - 'actor' role: strips `.target.` if present (e.g., `user.target.id` → `user.id`)
 * - 'target' role: adds `.target.` if not present (e.g., `user.id` → `user.target.id`)
 */
export const fieldForRole = (field: string, role: 'actor' | 'target'): string => {
  // Normalize to actor namespace first
  const actorField = field.replace('.target.', '.');
  if (role === 'actor') return actorField;
  // Transform to target namespace
  const dotIndex = actorField.indexOf('.');
  if (dotIndex === -1) return actorField;
  return `${actorField.substring(0, dotIndex)}.target.${actorField.substring(dotIndex + 1)}`;
};

/**
 * Extracts sourceFields from the first document's entity.
 * After deduplication in parse_records, each entity ID has one document with merged
 * sourceFields — multi-value fields are arrays (e.g., user.id: ["id1", "id2"]).
 */
export const getSourceFieldsFromNode = (
  node: NodeViewModel
): Record<string, string | string[]> | undefined => {
  if ('documentsData' in node) {
    const documentsData = node.documentsData;
    if (Array.isArray(documentsData) && documentsData.length > 0) {
      return (
        documentsData[0] as {
          entity?: { sourceFields?: Record<string, string | string[]> };
        }
      ).entity?.sourceFields;
    }
  }
  return undefined;
};

/**
 * Pre-bound callbacks for entity filter actions in the expand popover.
 * The caller (use_entity_node_expand_popover) binds these with node-specific data
 * so getEntityExpandItems doesn't need to know about sourceFields or entity types.
 */
export interface EntityFilterActions {
  toggleEntityFilter: (role: 'actor' | 'target', action: 'show' | 'hide') => void;
  isEntityFilterActive: (role: 'actor' | 'target') => boolean;
  toggleRelatedEvents: (action: 'show' | 'hide') => void;
  isRelatedEventsActive: () => boolean;
}

/**
 * Opt-in configuration for which items to render in the entity expand popover.
 * All items default to false - consumers must explicitly enable the items they want.
 */
export interface EntityExpandShouldRender {
  /** Show "Show entity relationships" toggle (entity store relationships) */
  showEntityRelationships?: boolean;
  /** Show "Show this entity's actions" filter toggle */
  showActionsByEntity?: boolean;
  /** Show "Show actions done to this entity" filter toggle */
  showActionsOnEntity?: boolean;
  /** Show "Show related events" filter toggle */
  showRelatedEvents?: boolean;
  /** Show "Show entity details" preview action */
  showEntityDetails?: boolean;
}

/**
 * Options for generating entity expand popover items.
 */
export interface GetEntityExpandItemsOptions {
  /** The node ID */
  nodeId: string;
  /** Pre-bound callbacks for entity filter actions */
  entityFilterActions?: EntityFilterActions;
  /** Callback to show entity details. Called when "Show entity details" is clicked. */
  onShowEntityDetails?: () => void;
  /** Callback to close the popover */
  onClose?: () => void;
  /** Opt-in configuration for which items to render. All default to false. */
  shouldRender: EntityExpandShouldRender;
  /** Whether entity details should be disabled (shown but not clickable). Defaults to false. */
  showEntityDetailsDisabled?: boolean;
  /** Whether entity relationships is currently expanded (controls show/hide label) */
  isEntityRelationshipsExpanded?: boolean;
  /** Callback to toggle entity relationships on/off */
  toggleEntityRelationships?: (action: 'show' | 'hide') => void;
  /** Whether entity relationships should be disabled. Defaults to false. */
  showEntityRelationshipsDisabled?: boolean;
}

const DISABLED_TOOLTIP = i18n.translate(
  'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityDetailsTooltipText',
  { defaultMessage: 'Details not available' }
);

/**
 * Generates entity expand popover items with onClick handlers.
 * Returns items ready to be rendered directly in ListGraphPopover.
 *
 * Uses opt-in pattern: consumers must explicitly enable each item type they want.
 */
export const getEntityExpandItems = (
  options: GetEntityExpandItemsOptions
): Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> => {
  const {
    onShowEntityDetails,
    onClose,
    entityFilterActions,
    shouldRender,
    showEntityDetailsDisabled = false,
    isEntityRelationshipsExpanded = false,
    toggleEntityRelationships,
    showEntityRelationshipsDisabled = false,
  } = options;

  const items: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> = [];

  // Entity relationships item (shown first, before filter actions)
  if (shouldRender.showEntityRelationships) {
    items.push({
      type: 'item',
      iconType: 'cluster',
      testSubject: GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_ITEM_ID,
      label: isEntityRelationshipsExpanded
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideEntityRelationships',
            { defaultMessage: 'Hide entity relationships' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityRelationships',
            { defaultMessage: 'Show entity relationships' }
          ),
      disabled: showEntityRelationshipsDisabled,
      onClick: () => {
        toggleEntityRelationships?.(isEntityRelationshipsExpanded ? 'hide' : 'show');
        onClose?.();
      },
      showToolTip: showEntityRelationshipsDisabled,
      toolTipText: showEntityRelationshipsDisabled
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.entityRelationshipsNotAvailable',
            { defaultMessage: 'Entity relationships not available' }
          )
        : undefined,
      toolTipProps: showEntityRelationshipsDisabled
        ? {
            position: 'bottom',
            'data-test-subj': GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_TOOLTIP_ID,
          }
        : undefined,
    });
  }

  // Filter action items
  if (shouldRender.showActionsByEntity) {
    const actionsByEntityActive = entityFilterActions?.isEntityFilterActive('actor') ?? false;
    items.push({
      type: 'item',
      iconType: 'sortRight',
      testSubject: GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
      label: actionsByEntityActive
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideThisEntitysActions',
            { defaultMessage: "Hide this entity's actions" }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showThisEntitysActions',
            { defaultMessage: "Show this entity's actions" }
          ),
      onClick: () => {
        entityFilterActions?.toggleEntityFilter('actor', actionsByEntityActive ? 'hide' : 'show');
        onClose?.();
      },
    });
  }

  if (shouldRender.showActionsOnEntity) {
    const actionsOnEntityActive = entityFilterActions?.isEntityFilterActive('target') ?? false;
    items.push({
      type: 'item',
      iconType: 'sortLeft',
      testSubject: GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
      label: actionsOnEntityActive
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideActionsDoneToThisEntity',
            { defaultMessage: 'Hide actions done to this entity' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showActionsDoneToThisEntity',
            { defaultMessage: 'Show actions done to this entity' }
          ),
      onClick: () => {
        entityFilterActions?.toggleEntityFilter('target', actionsOnEntityActive ? 'hide' : 'show');
        onClose?.();
      },
    });
  }

  if (shouldRender.showRelatedEvents) {
    const relatedEventsActive = entityFilterActions?.isRelatedEventsActive() ?? false;
    items.push({
      type: 'item',
      iconType: 'analyzeEvent',
      testSubject: GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
      label: relatedEventsActive
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideRelatedEntities',
            { defaultMessage: 'Hide related events' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showRelatedEntities',
            { defaultMessage: 'Show related events' }
          ),
      onClick: () => {
        entityFilterActions?.toggleRelatedEvents(relatedEventsActive ? 'hide' : 'show');
        onClose?.();
      },
    });
  }

  // Entity details item (with optional separator if filter items exist)
  if (shouldRender.showEntityDetails) {
    // Add separator if there are filter items before the entity details
    if (items.length > 0) {
      items.push({ type: 'separator' });
    }

    const handleEntityDetailsClick = () => {
      onShowEntityDetails?.();
      onClose?.();
    };

    items.push({
      type: 'item',
      iconType: 'maximize',
      testSubject: GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
      label: i18n.translate(
        'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityDetails',
        { defaultMessage: 'Show entity details' }
      ),
      disabled: showEntityDetailsDisabled,
      onClick: handleEntityDetailsClick,
      showToolTip: showEntityDetailsDisabled,
      toolTipText: showEntityDetailsDisabled ? DISABLED_TOOLTIP : undefined,
      toolTipProps: showEntityDetailsDisabled
        ? {
            position: 'bottom',
            'data-test-subj': GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_TOOLTIP_ID,
          }
        : undefined,
    });
  }

  return items;
};
