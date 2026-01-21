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
import { emitPreviewAction } from '../../preview_pub_sub';
import type { NodeViewModel } from '../../types';
import { getNodeDocumentMode, isEntityNodeEnriched } from '../../utils';
import {
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_TOOLTIP_ID,
} from '../../test_ids';
import { RELATED_ENTITY } from '../../../common/constants';
import type { EntityOrEventItem } from '../../graph_grouped_node_preview_panel/components/grouped_item/types';

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
 * Options for generating entity expand popover items.
 */
export interface GetEntityExpandItemsOptions {
  /** The node ID */
  nodeId: string;
  /** The node data */
  nodeData?: NodeViewModel;
  /** Function to check if a filter is currently active */
  isFilterActive: (field: string, value: string) => boolean;
  /** Callback to open event preview with full node data (for graph node popovers) */
  onOpenEventPreview?: (node: NodeViewModel) => void;
  /** Item to use for preview action via pub-sub (for flyout action buttons) */
  previewItem?: EntityOrEventItem;
  /** Callback to close the popover */
  onClose?: () => void;
}

const DISABLED_TOOLTIP = i18n.translate(
  'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityDetailsTooltipText',
  { defaultMessage: 'Details not available' }
);

/**
 * Generates entity expand popover items with onClick handlers.
 * Returns items ready to be rendered directly in ListGraphPopover.
 */
export const getEntityExpandItems = (
  options: GetEntityExpandItemsOptions
): Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> => {
  const { nodeId, nodeData, isFilterActive, onOpenEventPreview, previewItem, onClose } = options;

  // Determine document mode and fields from node data
  const docMode = nodeData ? getNodeDocumentMode(nodeData) : 'single-entity';
  const sourceNamespace = nodeData ? getSourceNamespaceFromNode(nodeData) : undefined;
  const actorField = getActorFieldFromNamespace(sourceNamespace);
  const targetField = getTargetFieldFromNamespace(sourceNamespace);

  // Determine if entity details should be disabled
  const hasPreviewAction = onOpenEventPreview !== undefined || previewItem !== undefined;
  const entityDetailsDisabled =
    !hasPreviewAction ||
    !['single-entity', 'grouped-entities'].includes(docMode) ||
    (docMode === 'single-entity' && nodeData !== undefined && !isEntityNodeEnriched(nodeData));

  // Create the entity details click handler
  const handleEntityDetailsClick = () => {
    if (onOpenEventPreview && nodeData) {
      onOpenEventPreview(nodeData);
    } else if (previewItem) {
      emitPreviewAction(previewItem);
    }
    onClose?.();
  };

  // Entity details item
  const entityDetailsItem: ItemExpandPopoverListItemProps = {
    type: 'item',
    iconType: 'expand',
    testSubject: GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
    label: i18n.translate(
      'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityDetails',
      { defaultMessage: 'Show entity details' }
    ),
    disabled: entityDetailsDisabled,
    onClick: handleEntityDetailsClick,
    showToolTip: entityDetailsDisabled,
    toolTipText: entityDetailsDisabled ? DISABLED_TOOLTIP : undefined,
    toolTipProps: entityDetailsDisabled
      ? {
          position: 'bottom',
          'data-test-subj': GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_TOOLTIP_ID,
        }
      : undefined,
  };

  // For 'grouped-entities', only show entity details
  if (docMode === 'grouped-entities') {
    return [entityDetailsItem];
  }

  // For 'single-entity', show filter actions + separator + entity details
  if (docMode === 'single-entity') {
    const actionsByEntityActive = isFilterActive(actorField, nodeId);
    const actionsOnEntityActive = isFilterActive(targetField, nodeId);
    const relatedEventsActive = isFilterActive(RELATED_ENTITY, nodeId);

    return [
      {
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
      },
      {
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
      },
      {
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
      },
      { type: 'separator' },
      entityDetailsItem,
    ];
  }

  // For other modes, return empty array
  return [];
};
