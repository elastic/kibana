/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback } from 'react';
import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useNodeExpandPopover } from './use_node_expand_popover';
import { getNodeDocumentMode, isEntityNodeEnriched } from '../../utils';
import type { NodeProps } from '../../types';
import {
  GRAPH_NODE_EXPAND_POPOVER_TEST_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_TOOLTIP_ID,
} from '../../test_ids';
import type {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from '../primitives/list_graph_popover';
import { RELATED_ENTITY } from '../../../common/constants';
import { addFilter, containsFilter, removeFilter } from '../../graph_investigation/search_filters';

type NodeToggleAction = 'show' | 'hide';

/**
 * Helper function to extract ecsParentField from the entity object in the first document.
 * This determines which ECS namespace field (user/host/service/entity) to use for filtering.
 */
const getSourceNamespaceFromNode = (node: NodeProps): string | undefined => {
  if ('documentsData' in node.data) {
    const documentsData = node.data.documentsData;
    if (Array.isArray(documentsData) && documentsData.length > 0) {
      return documentsData[0].entity?.ecsParentField;
    }
  }
  return undefined;
};

/**
 * Helper function to derive the actor field name based on the source namespace.
 * Maps namespace to the appropriate ECS actor field (e.g., 'user' -> 'user.entity.id').
 * Falls back to default entity.id if no namespace is provided.
 */
const getActorFieldFromNamespace = (sourceNamespace: string | undefined): string => {
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
const getTargetFieldFromNamespace = (sourceNamespace: string | undefined): string => {
  if (!sourceNamespace) {
    return 'entity.target.id';
  }
  return sourceNamespace === 'entity' ? 'entity.target.id' : `${sourceNamespace}.target.entity.id`;
};

/**
 * Hook to handle the entity node expand popover.
 * This hook is used to show the popover when the user clicks on the expand button of an entity node.
 * The popover contains the actions to show/hide the actions by entity, actions on entity, and related entities.
 *
 * @param setSearchFilters - Function to set the search filters.
 * @param dataViewId - The data view id.
 * @param searchFilters - The search filters.
 * @returns The entity node expand popover.
 */
export const useEntityNodeExpandPopover = (
  setSearchFilters: React.Dispatch<React.SetStateAction<Filter[]>>,
  dataViewId: string,
  searchFilters: Filter[],
  onShowEntityDetailsClick?: (node: NodeProps) => void
) => {
  const onToggleExploreRelatedEntitiesClick = useCallback(
    (node: NodeProps, action: NodeToggleAction) => {
      if (action === 'show') {
        setSearchFilters((prev) => addFilter(dataViewId, prev, RELATED_ENTITY, node.id));
      } else if (action === 'hide') {
        setSearchFilters((prev) => removeFilter(prev, RELATED_ENTITY, node.id));
      }
    },
    [dataViewId, setSearchFilters]
  );

  const onToggleActionsByEntityClick = useCallback(
    (node: NodeProps, action: NodeToggleAction) => {
      const sourceNamespace = getSourceNamespaceFromNode(node);
      const actorField = getActorFieldFromNamespace(sourceNamespace);

      if (action === 'show') {
        setSearchFilters((prev) => addFilter(dataViewId, prev, actorField, node.id));
      } else if (action === 'hide') {
        setSearchFilters((prev) => removeFilter(prev, actorField, node.id));
      }
    },
    [dataViewId, setSearchFilters]
  );

  const onToggleActionsOnEntityClick = useCallback(
    (node: NodeProps, action: NodeToggleAction) => {
      const sourceNamespace = getSourceNamespaceFromNode(node);
      const targetField = getTargetFieldFromNamespace(sourceNamespace);

      if (action === 'show') {
        setSearchFilters((prev) => addFilter(dataViewId, prev, targetField, node.id));
      } else if (action === 'hide') {
        setSearchFilters((prev) => removeFilter(prev, targetField, node.id));
      }
    },
    [dataViewId, setSearchFilters]
  );

  const itemsFn = useCallback(
    (
      node: NodeProps
    ): Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> => {
      const sourceNamespace = getSourceNamespaceFromNode(node);
      const actorField = getActorFieldFromNamespace(sourceNamespace);
      const targetField = getTargetFieldFromNamespace(sourceNamespace);
      const docMode = getNodeDocumentMode(node.data);

      const actionsByEntityAction = containsFilter(searchFilters, actorField, node.id)
        ? 'hide'
        : 'show';
      const actionsOnEntityAction = containsFilter(searchFilters, targetField, node.id)
        ? 'hide'
        : 'show';
      const relatedEntitiesAction = containsFilter(searchFilters, RELATED_ENTITY, node.id)
        ? 'hide'
        : 'show';

      const shouldDisableEntityDetailsListItem =
        !onShowEntityDetailsClick ||
        !['single-entity', 'grouped-entities'].includes(docMode) ||
        (docMode === 'single-entity' && !isEntityNodeEnriched(node.data));

      // Create the entity details item (shared between both modes - single-entity and grouped-entities)
      const entityDetailsItem: ItemExpandPopoverListItemProps = {
        type: 'item',
        iconType: 'expand',
        testSubject: GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
        label: i18n.translate(
          'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityDetails',
          {
            defaultMessage: 'Show entity details',
          }
        ),
        disabled: shouldDisableEntityDetailsListItem,
        onClick: () => {
          onShowEntityDetailsClick?.(node);
        },
        showToolTip: shouldDisableEntityDetailsListItem,
        toolTipText: shouldDisableEntityDetailsListItem
          ? i18n.translate(
              'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityDetailsTooltipText',
              {
                defaultMessage: 'Details not available',
              }
            )
          : undefined,
        toolTipProps: shouldDisableEntityDetailsListItem
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

      // For 'single-entity', show filter actions + entity details
      if (docMode === 'single-entity') {
        return [
          {
            type: 'item',
            iconType: 'sortRight',
            testSubject: GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
            label:
              actionsByEntityAction === 'show'
                ? i18n.translate(
                    'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showThisEntitysActions',
                    {
                      defaultMessage: "Show this entity's actions",
                    }
                  )
                : i18n.translate(
                    'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideThisEntitysActions',
                    {
                      defaultMessage: "Hide this entity's actions",
                    }
                  ),
            onClick: () => {
              onToggleActionsByEntityClick(node, actionsByEntityAction);
            },
          },
          {
            type: 'item',
            iconType: 'sortLeft',
            testSubject: GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
            label:
              actionsOnEntityAction === 'show'
                ? i18n.translate(
                    'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showActionsDoneToThisEntity',
                    {
                      defaultMessage: 'Show actions done to this entity',
                    }
                  )
                : i18n.translate(
                    'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideActionsDoneToThisEntity',
                    {
                      defaultMessage: 'Hide actions done to this entity',
                    }
                  ),
            onClick: () => {
              onToggleActionsOnEntityClick(node, actionsOnEntityAction);
            },
          },
          {
            type: 'item',
            iconType: 'analyzeEvent',
            testSubject: GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
            label:
              relatedEntitiesAction === 'show'
                ? i18n.translate(
                    'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showRelatedEntities',
                    {
                      defaultMessage: 'Show related events',
                    }
                  )
                : i18n.translate(
                    'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideRelatedEntities',
                    {
                      defaultMessage: 'Hide related events',
                    }
                  ),
            onClick: () => {
              onToggleExploreRelatedEntitiesClick(node, relatedEntitiesAction);
            },
          },
          {
            type: 'separator',
          },
          entityDetailsItem,
        ];
      }

      // For other modes, return empty array
      return [];
    },
    [
      onToggleActionsByEntityClick,
      onToggleActionsOnEntityClick,
      onToggleExploreRelatedEntitiesClick,
      onShowEntityDetailsClick,
      searchFilters,
    ]
  );
  const entityNodeExpandPopover = useNodeExpandPopover({
    id: 'entity-node-expand-popover',
    itemsFn,
    testSubject: GRAPH_NODE_EXPAND_POPOVER_TEST_ID,
  });
  return entityNodeExpandPopover;
};
