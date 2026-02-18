/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger } from '@kbn/core/server';
import { castArray } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { ApiMessageCode } from '@kbn/cloud-security-posture-common/types/graph/latest';
import type {
  ConnectorNodeType,
  EdgeColor,
  EdgeDataModel,
  EntityNodeDataModel,
  GraphResponse,
  GroupNodeDataModel,
  LabelNodeDataModel,
  NodeDataModel,
  NodeDocumentDataModel,
  RelationshipNodeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/v1';
import type { Writable } from '@kbn/utility-types';
import { ENTITY_RELATIONSHIP_LABELS } from '@kbn/cloud-security-posture-common/constants';
import {
  type EventEdge,
  type RelationshipEdge,
  NON_ENRICHED_ENTITY_TYPE_PLURAL,
  NON_ENRICHED_ENTITY_TYPE_SINGULAR,
} from './types';
import { transformEntityTypeToIconAndShape } from './utils';

interface ConnectorEdges {
  source: string;
  target: string;
  edgeType: EdgeDataModel['type'];
}

interface ParseContext {
  readonly nodesLimit?: number;
  readonly nodesMap: Record<string, NodeDataModel>;
  readonly edgesMap: Record<string, EdgeDataModel>;
  /**
   * Maps connector node ID (event or relationship) to array of edges (source-target pairs).
   * A single connector node can connect to multiple actor-target pairs when
   * MV_EXPAND creates multiple rows from the same document(s).
   * Used for both event events and relationship nodes.
   */
  readonly connectorEdges: Record<string, ConnectorEdges[]>;
  readonly messages: ApiMessageCode[];
  readonly logger: Logger;
}

interface NodeVisualProps {
  shape: EntityNodeDataModel['shape'];
  label?: EntityNodeDataModel['label'];
  tag?: EntityNodeDataModel['tag'];
  icon?: EntityNodeDataModel['icon'];
}

export const parseRecords = (
  logger: Logger,
  eventRecords: EventEdge[] = [],
  relationshipRecords: RelationshipEdge[] = [],
  nodesLimit?: number
): Pick<GraphResponse, 'nodes' | 'edges' | 'messages'> => {
  const ctx: ParseContext = {
    nodesLimit,
    logger,
    nodesMap: {},
    edgesMap: {},
    connectorEdges: {},
    messages: [],
  };

  logger.trace(
    `Parsing records [events: ${eventRecords.length}] [relationships: ${
      relationshipRecords.length
    }] [nodesLimit: ${nodesLimit ?? 'none'}]`
  );

  // Process event records
  for (const record of eventRecords) {
    if (isAboveAPINodesLimit(ctx)) {
      emitAPINodesLimitMessage(ctx);
      break;
    }
    processEventRecord(record, ctx);
  }

  // Process relationship records (shared limit with events)
  for (const record of relationshipRecords) {
    if (isAboveAPINodesLimit(ctx)) {
      emitAPINodesLimitMessage(ctx);
      break;
    }
    processRelationshipRecord(record, ctx);
  }

  // Create edges and groups for both
  createEdgesAndGroups(ctx);

  logger.trace(
    `Parsed [nodes: ${Object.keys(ctx.nodesMap).length}, edges: ${
      Object.keys(ctx.edgesMap).length
    }]`
  );

  // Sort groups to be first (fixes minor layout issue)
  const nodes = sortNodes(ctx.nodesMap);
  const edges = sortEdges(ctx.edgesMap, ctx.nodesMap);

  return {
    nodes,
    edges,
    messages: ctx.messages.length > 0 ? ctx.messages : undefined,
  };
};

const deriveEntityAttributesFromType = (entityGroupType: string): NodeVisualProps => {
  const mappedProps: Partial<NodeVisualProps> = {
    shape: 'rectangle',
  };

  if (entityGroupType) {
    const { icon, shape } = transformEntityTypeToIconAndShape(entityGroupType);
    if (icon) {
      mappedProps.icon = icon;
    }
    if (shape) {
      mappedProps.shape = shape;
    }
    mappedProps.tag = entityGroupType;
  }

  return mappedProps as NodeVisualProps;
};

/**
 * Resolves the entity type based on enrichment data
 * Falls back to singular/plural non-enriched types based on entity count
 */
const resolveEntityType = (entityType: string | null | undefined, idsCount: number): string => {
  if (entityType) {
    return entityType;
  }
  return idsCount === 1 ? NON_ENRICHED_ENTITY_TYPE_SINGULAR : NON_ENRICHED_ENTITY_TYPE_PLURAL;
};

/**
 * Generates the appropriate label for an entity node
 * Logic matches the previous ESQL EVAL calculations
 */
const generateEntityLabel = (
  idsCount: number,
  entityNodeId: string,
  entityType: string,
  entityName: string | string[] | null | undefined,
  entitySubType: string | null | undefined
): string => {
  // Single non-enriched entity: show the group ID (which is the entity ID for single entities)
  if (idsCount === 1 && entityType === NON_ENRICHED_ENTITY_TYPE_SINGULAR) {
    return entityNodeId;
  }
  // Single enriched entity: show the name (extract first element if array)
  if (idsCount === 1 && entityType !== NON_ENRICHED_ENTITY_TYPE_SINGULAR) {
    const name = Array.isArray(entityName) ? entityName[0] : entityName;
    return name || '';
  }
  // Multiple entities with subtype: show the subtype
  if (idsCount > 1 && entitySubType) {
    return entitySubType;
  }
  return '';
};

/**
 * Creates or updates an entity node in the nodesMap.
 * Shared by both event and relationship record processing.
 */
const createEntityNode = (
  nodesMap: Record<string, NodeDataModel>,
  params: {
    nodeId: string;
    idsCount: number;
    entityType?: string | null;
    entitySubType?: string | null;
    entityName?: string | string[] | null;
    docData?: Array<string | null> | string;
    hostIps?: string[];
  }
): void => {
  const { nodeId, idsCount, entityType, entitySubType, entityName, docData, hostIps } = params;

  if (nodesMap[nodeId] !== undefined) return;

  const resolvedType = resolveEntityType(entityType, idsCount);
  const label = generateEntityLabel(idsCount, nodeId, resolvedType, entityName, entitySubType);

  const documentsData: NodeDocumentDataModel[] = docData
    ? castArray(docData)
        .filter((d): d is string => d != null)
        .map((d) => JSON.parse(d))
    : [];

  nodesMap[nodeId] = {
    id: nodeId,
    color: 'primary' as const,
    ...(label ? { label } : {}),
    documentsData,
    ...deriveEntityAttributesFromType(resolvedType),
    ...(idsCount > 1 ? { count: idsCount } : {}),
    ...(hostIps && hostIps.length > 0 ? { ips: hostIps } : {}),
  };
};

const createGroupedActorAndTargetNodes = (
  record: EventEdge,
  context: ParseContext
): {
  actorId: string;
  targetId: string;
} => {
  const { nodesMap } = context;
  const {
    actorNodeId,
    actorIdsCount,
    actorsDocData,
    actorEntityType,
    actorEntitySubType,
    actorEntityName,
    actorHostIps,
    targetNodeId,
    targetIdsCount,
    targetsDocData,
    targetEntityType,
    targetEntitySubType,
    targetEntityName,
    targetHostIps,
  } = record;

  // Create actor entity node
  createEntityNode(nodesMap, {
    nodeId: actorNodeId,
    idsCount: actorIdsCount,
    entityType: actorEntityType,
    entitySubType: actorEntitySubType,
    entityName: actorEntityName,
    docData: actorsDocData,
    hostIps: actorHostIps ? castArray(actorHostIps) : [],
  });

  // Create target entity node (or unknown target)
  const targetId = targetIdsCount > 0 && targetNodeId ? targetNodeId : `unknown-${uuidv4()}`;

  if (targetIdsCount > 0 && targetNodeId) {
    createEntityNode(nodesMap, {
      nodeId: targetNodeId,
      idsCount: targetIdsCount,
      entityType: targetEntityType,
      entitySubType: targetEntitySubType,
      entityName: targetEntityName,
      docData: targetsDocData,
      hostIps: targetHostIps ? castArray(targetHostIps) : [],
    });
  } else if (nodesMap[targetId] === undefined) {
    // Unknown target
    nodesMap[targetId] = {
      id: targetId,
      color: 'primary' as const,
      label: 'Unknown',
      documentsData: [],
      ...deriveEntityAttributesFromType(''),
    };
  }

  return {
    actorId: actorNodeId,
    targetId,
  };
};

const createLabelNode = (record: EventEdge): LabelNodeDataModel => {
  const {
    labelNodeId,
    action,
    docs,
    isOrigin,
    isOriginAlert,
    isAlert,
    badge,
    uniqueEventsCount,
    uniqueAlertsCount,
    sourceIps,
    sourceCountryCodes,
  } = record;

  const labelId = `label(${action})ln(${labelNodeId})oe(${isOrigin ? 1 : 0})oa(${
    isOriginAlert ? 1 : 0
  })`;
  const color =
    uniqueAlertsCount >= 1 && uniqueEventsCount === 0 && (isOriginAlert || isAlert)
      ? 'danger'
      : 'primary';
  const sourceIpsArray = sourceIps ? castArray(sourceIps) : [];
  const sourceCountryCodesArray = sourceCountryCodes ? castArray(sourceCountryCodes) : [];

  return {
    id: labelId,
    label: action,
    color,
    shape: 'label',
    documentsData: parseDocumentsData(docs),
    count: badge,
    ...(uniqueEventsCount > 0 ? { uniqueEventsCount } : {}),
    ...(uniqueAlertsCount > 0 ? { uniqueAlertsCount } : {}),
    ...(sourceIpsArray.length > 0 ? { ips: sourceIpsArray } : {}),
    ...(sourceCountryCodesArray.length > 0 ? { countryCodes: sourceCountryCodesArray } : {}),
  };
};

/**
 * Unified function to process connector nodes (labels and relationships).
 * Adds the node to nodesMap if new, and accumulates edges in connectorEdges.
 */
const processConnectorNode = (
  context: ParseContext,
  nodeData: {
    sourceId: string;
    targetId: string;
    connectorNode: LabelNodeDataModel | RelationshipNodeDataModel;
  }
) => {
  const { nodesMap, connectorEdges } = context;
  const { sourceId, targetId, connectorNode } = nodeData;

  // Add node to nodesMap if new
  if (!nodesMap[connectorNode.id]) {
    nodesMap[connectorNode.id] = connectorNode;
    connectorEdges[connectorNode.id] = [];
  }

  // Add edge (source-target pair) - dedupe by checking existing edges
  const existingEdges = connectorEdges[connectorNode.id];
  const edgeExists = existingEdges.some((e) => e.source === sourceId && e.target === targetId);
  if (!edgeExists) {
    existingEdges.push({
      source: sourceId,
      target: targetId,
      edgeType: 'solid',
    });
  }
};

const isAboveAPINodesLimit = (context: ParseContext) => {
  const { nodesMap, nodesLimit } = context;
  return nodesLimit !== undefined && Object.keys(nodesMap).length >= nodesLimit;
};

const emitAPINodesLimitMessage = (context: ParseContext) => {
  const { nodesMap, nodesLimit, logger, messages } = context;
  logger.debug(
    `Reached nodes limit [limit: ${nodesLimit}] [current: ${Object.keys(nodesMap).length}]`
  );
  messages.push(ApiMessageCode.ReachedNodesLimit);
};

const processEventRecord = (record: EventEdge, context: ParseContext) => {
  const { actorId, targetId } = createGroupedActorAndTargetNodes(record, context);
  const labelNode = createLabelNode(record);

  processConnectorNode(context, {
    sourceId: actorId,
    targetId,
    connectorNode: labelNode,
  });
};

const getRelationshipLabel = (relationship: string): string =>
  ENTITY_RELATIONSHIP_LABELS[relationship as keyof typeof ENTITY_RELATIONSHIP_LABELS] ??
  relationship;

/**
 * Creates a relationship node for static/configuration-based relationships.
 * The node ID is based on relationshipNodeId (source + relationship) to ensure
 * one relationship node per source+relationship combination.
 */
const createRelationshipNode = (
  relationshipNodeId: string,
  relationship: string
): RelationshipNodeDataModel => {
  return {
    id: `rel(${relationshipNodeId})`,
    label: getRelationshipLabel(relationship),
    shape: 'relationship',
  };
};

const processRelationshipRecord = (record: RelationshipEdge, context: ParseContext) => {
  const actorNodeId = record.actorNodeId;
  const targetNodeId = record.targetNodeId;

  // Create actor and target entity nodes using shared helper
  createEntityNode(context.nodesMap, {
    nodeId: actorNodeId,
    idsCount: record.actorIdsCount,
    entityType: record.actorEntityType,
    entitySubType: record.actorEntitySubType,
    entityName: record.actorEntityName,
    docData: record.actorsDocData,
    hostIps: record.actorHostIps ? castArray(record.actorHostIps) : [],
  });

  createEntityNode(context.nodesMap, {
    nodeId: targetNodeId,
    idsCount: record.targetIdsCount,
    entityType: record.targetEntityType,
    entitySubType: record.targetEntitySubType,
    entityName: record.targetEntityName,
    docData: record.targetsDocData,
    hostIps: record.targetHostIps ? castArray(record.targetHostIps) : [],
  });

  // Create relationship node - ID is based on actor + relationship (relationshipNodeId)
  // so each actor+relationship combination gets one node that connects to all target groups
  const relationshipNode = createRelationshipNode(record.relationshipNodeId, record.relationship);

  processConnectorNode(context, {
    sourceId: actorNodeId,
    targetId: targetNodeId,
    connectorNode: relationshipNode,
  });
};

const sortNodes = (nodesMap: Record<string, NodeDataModel>) => {
  const groupNodes: NodeDataModel[] = [];
  const connectorNodes: (LabelNodeDataModel | RelationshipNodeDataModel)[] = [];
  const otherNodes: NodeDataModel[] = [];

  for (const node of Object.values(nodesMap)) {
    if (node.shape === 'group') {
      groupNodes.push(node);
    } else if (node.shape === 'relationship' || node.shape === 'label') {
      connectorNodes.push(node);
    } else {
      otherNodes.push(node);
    }
  }

  // Sort connector nodes: relationship before label, then alphabetical by label
  connectorNodes.sort((a, b) => {
    // Primary sort: relationship before label
    if (a.shape === 'relationship' && b.shape === 'label') return -1;
    if (a.shape === 'label' && b.shape === 'relationship') return 1;
    // Secondary sort: alphabetical by label
    const labelA = ('label' in a && a.label) || '';
    const labelB = ('label' in b && b.label) || '';
    return labelA.localeCompare(labelB);
  });

  return [...groupNodes, ...connectorNodes, ...otherNodes];
};

/**
 * Sort edges so relationship edges come before label edges.
 * This affects Dagre layout which positions nodes based on edge order.
 */
const sortEdges = (
  edgesMap: Record<string, EdgeDataModel>,
  nodesMap: Record<string, NodeDataModel>
): EdgeDataModel[] => {
  const edges = Object.values(edgesMap);

  // Helper to get the connector node shape for an edge
  const getConnectorShape = (edge: EdgeDataModel): 'relationship' | 'label' | 'other' => {
    // Check if target is a connector node
    const targetNode = nodesMap[edge.target];
    if (targetNode?.shape === 'relationship') return 'relationship';
    if (targetNode?.shape === 'label') return 'label';

    // Check if source is a connector node
    const sourceNode = nodesMap[edge.source];
    if (sourceNode?.shape === 'relationship') return 'relationship';
    if (sourceNode?.shape === 'label') return 'label';

    return 'other';
  };

  return edges.sort((a, b) => {
    const shapeA = getConnectorShape(a);
    const shapeB = getConnectorShape(b);

    // Priority: relationship > label > other
    const priority = { relationship: 0, label: 1, other: 2 };
    const shapeDiff = priority[shapeA] - priority[shapeB];

    // If same priority, sort alphabetically by edge ID for deterministic ordering
    if (shapeDiff !== 0) return shapeDiff;
    return a.id.localeCompare(b.id);
  });
};

/**
 * Helper to process either label or relationship connector groups.
 */
const processConnectorGroup = (
  groupingKey: string,
  connectorIds: string[],
  connectorEdgesMap: Record<string, ConnectorEdges[]>,
  edgesMap: Record<string, EdgeDataModel>,
  nodesMap: Record<string, NodeDataModel>,
  connectorType: ConnectorNodeType
) => {
  if (connectorIds.length === 1) {
    const connectorId = connectorIds[0];
    const edges = connectorEdgesMap[connectorId];

    // A single label can fan out to multiple targets (e.g., one action affecting multiple entities)
    // Create edges for all source-target pairs
    edges.forEach((edge) => {
      connectEntitiesAndConnectorNode(
        edgesMap,
        nodesMap,
        edge.source,
        connectorId,
        edge.target,
        edge.edgeType
      );
    });
  } else {
    // Create group node for multiple connectors
    const groupNode: GroupNodeDataModel = {
      id: `grp(${groupingKey})`,
      shape: 'group',
    };
    nodesMap[groupNode.id] = groupNode;

    let groupEdgesColor: EdgeColor = 'subdued';

    // Get all unique source-target pairs from all labels in this group
    const firstConnectorEdges = connectorEdgesMap[connectorIds[0]];

    // Order of creation matters when using dagre layout, first create edges to the group node,
    // then connect the group node to the connector nodes
    firstConnectorEdges.forEach((edge) => {
      connectEntitiesAndConnectorNode(
        edgesMap,
        nodesMap,
        edge.source,
        groupNode.id,
        edge.target,
        edge.edgeType,
        groupEdgesColor
      );
    });

    connectorIds.forEach((connectorId) => {
      const node = nodesMap[connectorId];
      (node as Writable<LabelNodeDataModel | RelationshipNodeDataModel>).parentId = groupNode.id;

      connectEntitiesAndConnectorNode(
        edgesMap,
        nodesMap,
        groupNode.id,
        connectorId,
        groupNode.id,
        connectorEdgesMap[connectorId][0].edgeType
      );

      // Update group color if any label node is danger
      if (connectorType === 'label' && (node as LabelNodeDataModel).color === 'danger') {
        groupEdgesColor = 'danger';
      }
    });
  }
};

const createEdgesAndGroups = (context: ParseContext) => {
  const { edgesMap, nodesMap, connectorEdges } = context;

  // Build grouping for connector nodes (labels and relationships)
  // Nodes with same source-target pairs get stacked together
  const labelGrouping: Record<string, string[]> = {};
  const relationshipGrouping: Record<string, string[]> = {};

  Object.entries(connectorEdges).forEach(([connectorNodeId, edges]) => {
    const node = nodesMap[connectorNodeId];
    if (!node) return;

    // Compute grouping key from all source-target pairs
    // Sort to ensure consistent key regardless of edge order
    const edgePairs = edges.map((e) => `${e.source}-${e.target}`).sort();
    const groupingKey = createHash('sha256').update(edgePairs.join(',')).digest('hex');

    // Build grouping maps by node type
    if (node.shape === 'label') {
      if (!labelGrouping[groupingKey]) {
        labelGrouping[groupingKey] = [];
      }
      labelGrouping[groupingKey].push(connectorNodeId);
    } else if (node.shape === 'relationship') {
      if (!relationshipGrouping[groupingKey]) {
        relationshipGrouping[groupingKey] = [];
      }
      relationshipGrouping[groupingKey].push(connectorNodeId);
    }
  });

  // Process label nodes (handles stacking)
  Object.entries(labelGrouping).forEach(([groupingKey, nodeIds]) => {
    processConnectorGroup(groupingKey, nodeIds, connectorEdges, edgesMap, nodesMap, 'label');
  });

  // Process relationship nodes (handles stacking)
  Object.entries(relationshipGrouping).forEach(([groupingKey, nodeIds]) => {
    processConnectorGroup(groupingKey, nodeIds, connectorEdges, edgesMap, nodesMap, 'relationship');
  });
};

const connectEntitiesAndConnectorNode = (
  edgesMap: Record<string, EdgeDataModel>,
  nodesMap: Record<string, NodeDataModel>,
  sourceNodeId: string,
  connectorNodeId: string,
  targetNodeId: string,
  edgeType: EdgeDataModel['type'] = 'solid',
  colorOverride?: EdgeColor
) => {
  [
    connectNodes(nodesMap, sourceNodeId, connectorNodeId, edgeType, colorOverride),
    connectNodes(nodesMap, connectorNodeId, targetNodeId, edgeType, colorOverride),
  ].forEach((edge) => {
    edgesMap[edge.id] = edge;
  });
};

const connectNodes = (
  nodesMap: Record<string, NodeDataModel>,
  sourceNodeId: string,
  targetNodeId: string,
  edgeType: EdgeDataModel['type'] = 'solid',
  colorOverride?: EdgeColor
): EdgeDataModel => {
  const sourceNode = nodesMap[sourceNodeId];
  const targetNode = nodesMap[targetNodeId];
  const color =
    (sourceNode.shape === 'label' && sourceNode.color === 'danger') ||
    (targetNode.shape === 'label' && targetNode.color === 'danger')
      ? 'danger'
      : 'subdued';

  return {
    id: `a(${sourceNodeId})-b(${targetNodeId})`,
    source: sourceNodeId,
    target: targetNodeId,
    color: colorOverride ?? color,
    type: edgeType,
  };
};

const parseDocumentsData = (docs: string[] | string): NodeDocumentDataModel[] => {
  if (typeof docs === 'string') {
    return [JSON.parse(docs)];
  }

  return docs.map((doc) => JSON.parse(doc));
};
