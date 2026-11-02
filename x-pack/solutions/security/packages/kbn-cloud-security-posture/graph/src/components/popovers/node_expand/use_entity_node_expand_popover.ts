/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { useNodeExpandPopover } from './use_node_expand_popover';
import type { NodeProps, NodeViewModel } from '../../types';
import type { GraphTelemetryHandler } from '../../graph_telemetry';
import { GRAPH_NODE_EXPAND_POPOVER_TEST_ID } from '../../test_ids';
import {
  getEntityExpandItems,
  getSourceFieldsFromNode,
  getEntityFilterSpec,
  toggleEntityFilterSpec,
  isEntityFilterSpecActive,
  getRelatedEventsFilter,
} from './get_entity_expand_items';
import type { EntityFilterActions, EuidFilterApi } from './get_entity_expand_items';
import { getNodeDocumentMode, isEntityNodeEnriched } from '../../utils';
import {
  emitFilterToggle,
  emitIsOneOfFilterToggle,
  isFilterActiveForScope,
  emitEntityRelationshipToggle,
  isEntityRelationshipExpandedForScope,
  isInitialEntityForScope,
  emitPinnedEuidToggle,
} from '../../filters/filter_store';

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
 * @param euidApi - Optional EUID API used to narrow entity filters to the highest-ranking
 *                  identity fields. Supplied by the consumer (async-hydrated via
 *                  `useEntityStoreEuidApi()`); until it resolves, filters fall back to the
 *                  unnarrowed sourceFields.
 * @param onTelemetryEvent - Optional callback invoked when the user triggers a popover action.
 * @returns The entity node expand popover.
 */
export const useEntityNodeExpandPopover = (
  scopeId: string,
  onOpenEventPreview?: (node: NodeViewModel) => void,
  euidApi?: EuidFilterApi,
  onTelemetryEvent?: GraphTelemetryHandler
) => {
  const isDarkMode = useKibanaIsDarkMode();
  const itemsFn = useCallback(
    (node: NodeProps) => {
      const docMode = getNodeDocumentMode(node.data);
      const isSingleEntity = docMode === 'single-entity';
      const isGroupedEntities = docMode === 'grouped-entities';
      const isEnriched = isEntityNodeEnriched(node.data);
      const isInitialEntity = isInitialEntityForScope(scopeId, node.id);

      const sourceFields = getSourceFieldsFromNode(node.data);

      const engineType =
        'documentsData' in node.data &&
        Array.isArray(node.data.documentsData) &&
        node.data.documentsData.length > 0
          ? (
              node.data.documentsData[0] as {
                entity?: { engine_type?: string };
              }
            ).entity?.engine_type
          : undefined;

      // Entity filters come from the Entity Store's EUID logic as a boolean KQL expression
      // (ranked identity field + higher-ranked-field guards + namespace clause), falling back to
      // the identity sourceFields until the EUID API's lazy chunk has loaded.
      const specByRole = {
        actor: getEntityFilterSpec(node.id, sourceFields, euidApi, 'actor'),
        target: getEntityFilterSpec(node.id, sourceFields, euidApi, 'target'),
      } as const;
      const filterKey = (role: 'actor' | 'target') => `${node.id}|${role}`;

      const entityFilterActions: EntityFilterActions = {
        toggleEntityFilter: (role, action) => {
          const spec = specByRole[role];
          if (!spec) return;
          onTelemetryEvent?.({
            type: 'node_action',
            nodeType: 'entity',
            action: role === 'actor' ? 'show_actions_by' : 'show_actions_on',
            state: action,
          });
          toggleEntityFilterSpec(scopeId, filterKey(role), spec, role, action);

          if (action === 'show') {
            emitPinnedEuidToggle(scopeId, node.id, 'show');
          } else {
            // Only unpin when no entity filter remains active for either role
            const hasRemainingFilters = (['actor', 'target'] as const).some((r) => {
              const roleSpec = specByRole[r];
              return (
                roleSpec != null && isEntityFilterSpecActive(scopeId, filterKey(r), roleSpec, r)
              );
            });
            if (!hasRemainingFilters) {
              emitPinnedEuidToggle(scopeId, node.id, 'hide');
            }
          }
        },
        isEntityFilterActive: (role) => {
          const spec = specByRole[role];
          return spec != null && isEntityFilterSpecActive(scopeId, filterKey(role), spec, role);
        },
        toggleRelatedEvents: (action) => {
          const related = getRelatedEventsFilter(node.id, sourceFields, engineType);
          if (!related) return;
          onTelemetryEvent?.({
            type: 'node_action',
            nodeType: 'entity',
            action: 'show_related_events',
            state: action,
          });
          if (related.values.length === 1) {
            emitFilterToggle(scopeId, related.field, related.values[0], action);
          } else {
            emitIsOneOfFilterToggle(scopeId, related.field, related.values, action);
          }
        },
        isRelatedEventsActive: () => {
          const related = getRelatedEventsFilter(node.id, sourceFields, engineType);
          if (!related) return false;
          return isFilterActiveForScope(scopeId, related.field, related.values);
        },
      };

      return getEntityExpandItems({
        nodeId: node.id,
        entityFilterActions,
        onShowEntityDetails: onOpenEventPreview
          ? () => {
              onTelemetryEvent?.(
                isGroupedEntities
                  ? {
                      type: 'node_action',
                      nodeType: 'grouped_entity',
                      action: 'show_grouped_entities',
                    }
                  : { type: 'node_action', nodeType: 'entity', action: 'show_details' }
              );
              onOpenEventPreview(node.data);
            }
          : undefined,
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
        isGrouped: isGroupedEntities,
        isEntityRelationshipsExpanded: isEntityRelationshipExpandedForScope(scopeId, node.id),
        isInitialEntity,
        toggleEntityRelationships: (action) => {
          onTelemetryEvent?.({
            type: 'node_action',
            nodeType: 'entity',
            action: 'show_entity_relationships',
            state: action,
          });
          emitEntityRelationshipToggle(scopeId, node.id, action);
          emitPinnedEuidToggle(scopeId, node.id, action);
        },
        showEntityRelationshipsDisabled: !isEnriched || isInitialEntity,
        showEntityDetailsDisabled: isSingleEntity && !isEnriched,
        isDarkMode,
      });
    },
    [scopeId, onOpenEventPreview, euidApi, onTelemetryEvent, isDarkMode]
  );

  return useNodeExpandPopover({
    id: 'entity-node-expand-popover',
    itemsFn,
    testSubject: GRAPH_NODE_EXPAND_POPOVER_TEST_ID,
  });
};
