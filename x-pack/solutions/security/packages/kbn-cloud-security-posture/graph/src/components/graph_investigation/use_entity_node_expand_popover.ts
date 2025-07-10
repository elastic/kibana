/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useNodeExpandGraphPopover } from './use_node_expand_graph_popover';
import { getNodeDocumentMode, type NodeProps } from '../../..';
import {
  GRAPH_NODE_EXPAND_POPOVER_TEST_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
} from '../test_ids';
import {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from './list_group_graph_popover';
import { ACTOR_ENTITY_ID, RELATED_ENTITY, TARGET_ENTITY_ID } from '../../common/constants';
import { addFilter, containsFilter, removeFilter } from './search_filters';

type NodeToggleAction = 'show' | 'hide';

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
      if (action === 'show') {
        setSearchFilters((prev) => addFilter(dataViewId, prev, ACTOR_ENTITY_ID, node.id));
      } else if (action === 'hide') {
        setSearchFilters((prev) => removeFilter(prev, ACTOR_ENTITY_ID, node.id));
      }
    },
    [dataViewId, setSearchFilters]
  );

  const onToggleActionsOnEntityClick = useCallback(
    (node: NodeProps, action: NodeToggleAction) => {
      if (action === 'show') {
        setSearchFilters((prev) => addFilter(dataViewId, prev, TARGET_ENTITY_ID, node.id));
      } else if (action === 'hide') {
        setSearchFilters((prev) => removeFilter(prev, TARGET_ENTITY_ID, node.id));
      }
    },
    [dataViewId, setSearchFilters]
  );

  const itemsFn = useCallback(
    (
      node: NodeProps
    ): Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> => {
      const actionsByEntityAction = containsFilter(searchFilters, ACTOR_ENTITY_ID, node.id)
        ? 'hide'
        : 'show';
      const actionsOnEntityAction = containsFilter(searchFilters, TARGET_ENTITY_ID, node.id)
        ? 'hide'
        : 'show';
      const relatedEntitiesAction = containsFilter(searchFilters, RELATED_ENTITY, node.id)
        ? 'hide'
        : 'show';

      const shouldShowEntityDetailsListItem =
        onShowEntityDetailsClick && getNodeDocumentMode(node.data) === 'single-entity';

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
        ...(shouldShowEntityDetailsListItem
          ? ([
              {
                type: 'separator',
              },
              {
                type: 'item',
                iconType: 'expand',
                testSubject: GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
                label: i18n.translate(
                  'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityDetails',
                  {
                    defaultMessage: 'Show entity details',
                  }
                ),
                onClick: () => {
                  onShowEntityDetailsClick(node);
                },
              },
            ] satisfies Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps>)
          : []),
      ];
    },
    [
      onToggleActionsByEntityClick,
      onToggleActionsOnEntityClick,
      onToggleExploreRelatedEntitiesClick,
      onShowEntityDetailsClick,
      searchFilters,
    ]
  );
  const entityNodeExpandPopover = useNodeExpandGraphPopover({
    id: 'entity-node-expand-popover',
    itemsFn,
    testSubject: GRAPH_NODE_EXPAND_POPOVER_TEST_ID,
  });
  return entityNodeExpandPopover;
};
