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
import { emitFilterAction } from '../../filters/filter_pub_sub';
import { isFilterActive } from '../../filters/filter_state';
import {
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_TOOLTIP_ID,
} from '../../test_ids';
import { RELATED_ENTITY } from '../../../common/constants';

/**
 * Helper function to extract ecsParentField from the entity object in the first document.
 * This determines which ECS namespace field (user/host/service/entity) to use for filtering.
 */
export const getSourceNamespaceFromNode = (node: NodeViewModel): string | undefined => {
  if ('documentsData' in node) {
    const documentsData = node.documentsData;
    if (Array.isArray(documentsData) && documentsData.length > 0) {
      return (documentsData[0] as { entity?: { ecsParentField?: string } }).entity?.ecsParentField;
    }
  }
  return undefined;
};

/**
 * Helper function to derive the actor field name based on the source namespace.
 * Maps namespace to the appropriate ECS actor field (e.g., 'user' -> 'user.entity.id').
 * Falls back to default entity.id if no namespace is provided.
 */
export const getActorFieldFromNamespace = (sourceNamespace: string | undefined): string => {
  if (!sourceNamespace) {
    return 'entity.id';
  }
  return sourceNamespace === 'entity' ? 'entity.id' : `${sourceNamespace}.entity.id`;
};

/**
 * Helper function to derive the target field name based on the source namespace.
 * Maps namespace to the appropriate ECS target field (e.g., 'user' -> 'user.target.entity.id').
 * Falls back to default entity.target.id if no namespace is provided.
 */
export const getTargetFieldFromNamespace = (sourceNamespace: string | undefined): string => {
  if (!sourceNamespace) {
    return 'entity.target.id';
  }
  return sourceNamespace === 'entity' ? 'entity.target.id' : `${sourceNamespace}.target.entity.id`;
};

/**
 * Opt-in configuration for which items to render in the entity expand popover.
 * All items default to false - consumers must explicitly enable the items they want.
 */
export interface EntityExpandShouldRender {
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
  /**
   * The source namespace from node data (e.g., 'user', 'host', 'service', 'entity').
   * Used to derive the correct ECS field names for actor and target filters.
   * Can be obtained using getSourceNamespaceFromNode(nodeData).
   */
  sourceNamespace?: string;
  /** Callback to show entity details. Called when "Show entity details" is clicked. */
  onShowEntityDetails?: () => void;
  /** Callback to close the popover */
  onClose?: () => void;
  /** Opt-in configuration for which items to render. All default to false. */
  shouldRender: EntityExpandShouldRender;
  /** Whether entity details should be disabled (shown but not clickable). Defaults to false. */
  showEntityDetailsDisabled?: boolean;
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
    nodeId,
    sourceNamespace,
    onShowEntityDetails,
    onClose,
    shouldRender,
    showEntityDetailsDisabled = false,
  } = options;

  // Derive ECS field names from source namespace
  const actorField = getActorFieldFromNamespace(sourceNamespace);
  const targetField = getTargetFieldFromNamespace(sourceNamespace);

  const items: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> = [];

  // Filter action items
  if (shouldRender.showActionsByEntity) {
    const actionsByEntityActive = isFilterActive(actorField, nodeId);
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
        emitFilterAction({
          type: 'TOGGLE_ACTIONS_BY_ENTITY',
          field: actorField,
          value: nodeId,
          action: actionsByEntityActive ? 'hide' : 'show',
        });
        onClose?.();
      },
    });
  }

  if (shouldRender.showActionsOnEntity) {
    const actionsOnEntityActive = isFilterActive(targetField, nodeId);
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
        emitFilterAction({
          type: 'TOGGLE_ACTIONS_ON_ENTITY',
          field: targetField,
          value: nodeId,
          action: actionsOnEntityActive ? 'hide' : 'show',
        });
        onClose?.();
      },
    });
  }

  if (shouldRender.showRelatedEvents) {
    const relatedEventsActive = isFilterActive(RELATED_ENTITY, nodeId);
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
        emitFilterAction({
          type: 'TOGGLE_RELATED_EVENTS',
          field: RELATED_ENTITY,
          value: nodeId,
          action: relatedEventsActive ? 'hide' : 'show',
        });
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
      iconType: 'expand',
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
