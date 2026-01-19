/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeViewModel } from '../../types';
import { getNodeDocumentMode, isEntityNodeEnriched } from '../../utils';
import {
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
} from '../../test_ids';
import { RELATED_ENTITY } from '../../../common/constants';
import type { FilterActionType } from '../../graph_investigation/filter_actions';

/**
 * Action descriptor for entity expand popover items.
 * Contains all the data needed to render a menu item and emit filter actions.
 * Does NOT contain labels or onClick handlers - those are bound by the caller.
 */
export interface EntityExpandItemDescriptor {
  /** Unique item type identifier */
  type:
    | 'show-actions-by-entity'
    | 'show-actions-on-entity'
    | 'show-related-events'
    | 'show-entity-details';
  /** Icon to display */
  iconType: string;
  /** Test subject for automation */
  testSubject: string;
  /** The field to filter on (for filter actions) */
  field?: string;
  /** The value to filter for */
  value?: string;
  /** Current toggle state - 'show' means filter is not active, 'hide' means it is */
  currentAction?: 'show' | 'hide';
  /** Filter action type to emit when clicked */
  filterActionType?: FilterActionType;
  /** Whether this item should be disabled */
  disabled?: boolean;
  /** Tooltip text when disabled */
  disabledTooltip?: string;
}

/**
 * Input for entity expand item generation.
 * Contains the minimal data needed to generate item descriptors.
 */
export interface EntityExpandInput {
  /** Entity ID (node.id) */
  id: string;
  /** Node document mode */
  docMode: ReturnType<typeof getNodeDocumentMode>;
  /** Actor field derived from source namespace (e.g., 'user.entity.id') */
  actorField: string;
  /** Target field derived from source namespace (e.g., 'user.target.entity.id') */
  targetField: string;
  /** Whether entity details action should be disabled */
  entityDetailsDisabled: boolean;
}

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
 * Create EntityExpandInput from a NodeProps (with node.id from React Flow).
 * Helper to extract the necessary data for item generation.
 *
 * @param nodeId - The node id (from NodeProps.id, the React Flow node id)
 * @param nodeData - The node data (NodeViewModel)
 * @param hasEntityDetailsHandler - Whether entity details handler is available
 */
export const createEntityExpandInput = (
  nodeId: string,
  nodeData: NodeViewModel,
  hasEntityDetailsHandler: boolean
): EntityExpandInput => {
  const sourceNamespace = getSourceNamespaceFromNode(nodeData);
  const actorField = getActorFieldFromNamespace(sourceNamespace);
  const targetField = getTargetFieldFromNamespace(sourceNamespace);
  const docMode = getNodeDocumentMode(nodeData);

  const entityDetailsDisabled =
    !hasEntityDetailsHandler ||
    !['single-entity', 'grouped-entities'].includes(docMode) ||
    (docMode === 'single-entity' && !isEntityNodeEnriched(nodeData));

  return {
    id: nodeId,
    docMode,
    actorField,
    targetField,
    entityDetailsDisabled,
  };
};

/**
 * Pure function to generate entity expand item descriptors.
 * Returns an array of item descriptors based on the node state.
 * The caller is responsible for:
 * - Resolving labels (i18n)
 * - Binding onClick handlers
 * - Determining current filter state (isFilterActive)
 *
 * @param input - Entity expand input containing node data
 * @param isFilterActive - Function to check if a filter is currently active
 * @returns Array of item descriptors
 */
export const getEntityExpandItems = (
  input: EntityExpandInput,
  isFilterActive: (field: string, value: string) => boolean
): EntityExpandItemDescriptor[] => {
  const { id, docMode, actorField, targetField, entityDetailsDisabled } = input;

  // Entity details item (shared between single-entity and grouped-entities)
  const entityDetailsItem: EntityExpandItemDescriptor = {
    type: 'show-entity-details',
    iconType: 'expand',
    testSubject: GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
    disabled: entityDetailsDisabled,
    disabledTooltip: entityDetailsDisabled ? 'Details not available' : undefined,
  };

  // For 'grouped-entities', only show entity details
  if (docMode === 'grouped-entities') {
    return [entityDetailsItem];
  }

  // For 'single-entity', show filter actions + entity details
  if (docMode === 'single-entity') {
    const actionsByEntityActive = isFilterActive(actorField, id);
    const actionsOnEntityActive = isFilterActive(targetField, id);
    const relatedEventsActive = isFilterActive(RELATED_ENTITY, id);

    return [
      {
        type: 'show-actions-by-entity',
        iconType: 'sortRight',
        testSubject: GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
        field: actorField,
        value: id,
        currentAction: actionsByEntityActive ? 'hide' : 'show',
        filterActionType: 'TOGGLE_ACTIONS_BY_ENTITY',
      },
      {
        type: 'show-actions-on-entity',
        iconType: 'sortLeft',
        testSubject: GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
        field: targetField,
        value: id,
        currentAction: actionsOnEntityActive ? 'hide' : 'show',
        filterActionType: 'TOGGLE_ACTIONS_ON_ENTITY',
      },
      {
        type: 'show-related-events',
        iconType: 'analyzeEvent',
        testSubject: GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
        field: RELATED_ENTITY,
        value: id,
        currentAction: relatedEventsActive ? 'hide' : 'show',
        filterActionType: 'TOGGLE_RELATED_EVENTS',
      },
      entityDetailsItem,
    ];
  }

  // For other modes, return empty array
  return [];
};
