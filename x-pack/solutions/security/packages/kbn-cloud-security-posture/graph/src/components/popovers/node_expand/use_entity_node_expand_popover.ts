/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useNodeExpandPopover } from './use_node_expand_popover';
import type { NodeProps, NodeViewModel } from '../../types';
import { GRAPH_NODE_EXPAND_POPOVER_TEST_ID } from '../../test_ids';
import {
  getEntityExpandItems,
  getSourceFieldsFromNode,
  fieldForRole,
} from './get_entity_expand_items';
import type { EntityFilterActions } from './get_entity_expand_items';
import { getNodeDocumentMode, isEntityNodeEnriched } from '../../utils';
import {
  emitFilterToggle,
  isFilterActiveForScope,
  emitEntityRelationshipToggle,
  isEntityRelationshipExpandedForScope,
  isInitialEntityForScope,
} from '../../filters/filter_store';
import { RELATED_ENTITY } from '../../../common/constants';

/**
 * Hook to handle the entity node expand popover.
 * This hook is used to show the popover when the user clicks on the expand button of an entity node.
 * The popover contains the actions to show/hide the actions by entity, actions on entity, and related entities.
 *
 * Uses graph entity filter event bus for actor/target filter state.
 * Uses filter event bus for related events (pinning via RELATED_ENTITY).
 * Uses entity relationship event bus for relationship state.
 *
 * @param scopeId - The unique identifier for the graph instance (used to scope filter state)
 * @param onOpenEventPreview - Optional callback to open event preview with full node data.
 *                             If provided, clicking "Show entity details" calls this callback.
 * @returns The entity node expand popover.
 */
export const useEntityNodeExpandPopover = (
  scopeId: string,
  onOpenEventPreview?: (node: NodeViewModel) => void
) => {
  const itemsFn = useCallback(
    (node: NodeProps) => {
      const docMode = getNodeDocumentMode(node.data);
      const isSingleEntity = docMode === 'single-entity';
      const isGroupedEntities = docMode === 'grouped-entities';
      const isEnriched = isEntityNodeEnriched(node.data);
      const isInitialEntity = isInitialEntityForScope(scopeId, node.id);

      const sourceFields = getSourceFieldsFromNode(node.data);

      const entityFilterActions: EntityFilterActions = {
        toggleEntityFilter: (role, action) => {
          for (const [field, value] of Object.entries(sourceFields ?? {})) {
            // Flatten string | string[] to string[] so each value gets its own OR'd phrase filter
            for (const v of ([] as string[]).concat(value)) {
              emitFilterToggle(scopeId, fieldForRole(field, role), v, action);
            }
          }
        },
        isEntityFilterActive: (role) =>
          Object.entries(sourceFields ?? {}).some(([field, value]) =>
            ([] as string[])
              .concat(value)
              .some((v) => isFilterActiveForScope(scopeId, fieldForRole(field, role), v))
          ),
        toggleRelatedEvents: (action) => emitFilterToggle(scopeId, RELATED_ENTITY, node.id, action),
        isRelatedEventsActive: () => isFilterActiveForScope(scopeId, RELATED_ENTITY, node.id),
      };

      return getEntityExpandItems({
        nodeId: node.id,
        entityFilterActions,
        onShowEntityDetails: onOpenEventPreview ? () => onOpenEventPreview(node.data) : undefined,
        shouldRender: {
          // Entity relationships only for single-entity mode when full feature set is active
          showEntityRelationships: isSingleEntity && onOpenEventPreview !== undefined,
          // Filter actions only for single-entity mode
          showActionsByEntity: isSingleEntity,
          showActionsOnEntity: isSingleEntity,
          showRelatedEvents: isSingleEntity,
          // Entity details for both single and grouped, when handler available
          showEntityDetails:
            (isSingleEntity || isGroupedEntities) && onOpenEventPreview !== undefined,
        },
        isEntityRelationshipsExpanded: isEntityRelationshipExpandedForScope(scopeId, node.id),
        isInitialEntity,
        toggleEntityRelationships: (action) =>
          emitEntityRelationshipToggle(scopeId, node.id, action),
        showEntityRelationshipsDisabled: !isEnriched || isInitialEntity,
        showEntityDetailsDisabled: isSingleEntity && !isEnriched,
      });
    },
    [scopeId, onOpenEventPreview]
  );

  return useNodeExpandPopover({
    id: 'entity-node-expand-popover',
    itemsFn,
    testSubject: GRAPH_NODE_EXPAND_POPOVER_TEST_ID,
  });
};
