/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger } from '@kbn/core/server';
import { castArray, omit } from 'lodash';
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
import { GRAPH_ACTOR_EUID_SOURCE_FIELDS } from './constants';
import {
  type EventEdge,
  type EventEsqlRow,
  type RelationshipEdge,
  type RelationshipEsqlRow,
  type EntityRecord,
  NON_ENRICHED_ENTITY_TYPE_PLURAL,
  NON_ENRICHED_ENTITY_TYPE_SINGULAR,
} from './types';
import {
  transformEntityTypeToIconAndShape,
  compareConnectorNodes,
  hashIds,
  addValuesToSet,
  filterDocDataToIds,
  rebuildDocData,
} from './utils';
import type { EntityEnrichmentFields } from './fetch_entity_enrichment';

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
  entityRecords: EntityRecord[] = [],
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
    }] [entities: ${entityRecords.length}] [nodesLimit: ${nodesLimit ?? 'none'}]`
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

  for (const entity of entityRecords) {
    if (ctx.nodesMap[entity.id] === undefined) {
      createEntityNode(
        ctx.nodesMap,
        {
          nodeId: entity.id,
          idsCount: 1,
          entityType: entity.type,
          entitySubType: entity.sub_type,
          entityName: entity.name,
          docData: entity.docData ? castArray(entity.docData) : [],
        },
        ctx.logger
      );
    }
  }

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
  },
  logger?: Logger
): void => {
  const { nodeId, idsCount, entityType, entitySubType, entityName, docData, hostIps } = params;
  const EXPAND_DOT_NOTATION = false;

  if (nodesMap[nodeId] !== undefined) return;

  const resolvedType = resolveEntityType(entityType, idsCount);
  const label = generateEntityLabel(idsCount, nodeId, resolvedType, entityName, entitySubType);

  const documentsData: NodeDocumentDataModel[] | undefined = docData
    ? parseDocumentsData(logger, docData)
    : undefined;

  documentsData?.forEach((doc) => {
    if (doc.entity?.sourceFields) {
      const currentlySupportedSourceFields = omit(
        doc.entity.sourceFields,
        GRAPH_ACTOR_EUID_SOURCE_FIELDS.all
      );
      (doc as Writable<typeof doc>).entity = {
        ...doc.entity,
        sourceFields: EXPAND_DOT_NOTATION
          ? expandDotNotation(currentlySupportedSourceFields)
          : currentlySupportedSourceFields,
      };
    }
  });

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
  const { nodesMap, logger } = context;
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
  createEntityNode(
    nodesMap,
    {
      nodeId: actorNodeId,
      idsCount: actorIdsCount,
      entityType: actorEntityType,
      entitySubType: actorEntitySubType,
      entityName: actorEntityName,
      docData: actorsDocData,
      hostIps: actorHostIps ? castArray(actorHostIps) : [],
    },
    logger
  );

  // Create target entity node (or unknown target)
  const targetId = targetIdsCount > 0 && targetNodeId ? targetNodeId : `unknown-${uuidv4()}`;

  if (targetIdsCount > 0 && targetNodeId) {
    createEntityNode(
      nodesMap,
      {
        nodeId: targetNodeId,
        idsCount: targetIdsCount,
        entityType: targetEntityType,
        entitySubType: targetEntitySubType,
        entityName: targetEntityName,
        docData: targetsDocData,
        hostIps: targetHostIps ? castArray(targetHostIps) : [],
      },
      logger
    );
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

const createLabelNode = (logger: Logger | undefined, record: EventEdge): LabelNodeDataModel => {
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
    documentsData: parseDocumentsData(logger, docs),
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
  const labelNode = createLabelNode(context.logger, record);

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
  createEntityNode(
    context.nodesMap,
    {
      nodeId: actorNodeId,
      idsCount: record.actorIdsCount,
      entityType: record.actorEntityType,
      entitySubType: record.actorEntitySubType,
      entityName: record.actorEntityName,
      docData: record.actorsDocData,
      hostIps: record.actorHostIps ? castArray(record.actorHostIps) : [],
    },
    context.logger
  );

  createEntityNode(
    context.nodesMap,
    {
      nodeId: targetNodeId,
      idsCount: record.targetIdsCount,
      entityType: record.targetEntityType,
      entitySubType: record.targetEntitySubType,
      entityName: record.targetEntityName,
      docData: record.targetsDocData,
      hostIps: record.targetHostIps ? castArray(record.targetHostIps) : [],
    },
    context.logger
  );

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

  connectorNodes.sort(compareConnectorNodes);

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

const parseDocumentsData = (
  logger: Logger | undefined,
  docs: Array<string | null> | string
): NodeDocumentDataModel[] => {
  if (typeof docs === 'string') {
    try {
      return [JSON.parse(docs)];
    } catch (e) {
      logger?.error(`Failed to parse document data: ${e}`);
      logger?.trace(docs);
      throw e;
    }
  }

  return docs
    .filter((d): d is string => d != null)
    .map((doc) => {
      try {
        return JSON.parse(doc);
      } catch (e) {
        logger?.error(`Failed to parse document data: ${e}`);
        logger?.trace(doc);
        throw e;
      }
    });
};

const expandDotNotation = (flat: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [dotKey, value] of Object.entries(flat)) {
    const parts = dotKey.split('.');
    let cursor = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cursor[parts[i]] == null || typeof cursor[parts[i]] !== 'object') {
        cursor[parts[i]] = {};
      }
      cursor = cursor[parts[i]] as Record<string, unknown>;
    }
    cursor[parts[parts.length - 1]] = value;
  }
  return result;
};

// ---------------------------------------------------------------------------
// Regrouping: transform STATS-pre-aggregated ES|QL rows into the graph model
// (EventEdge / RelationshipEdge). Moved here from the fetch_* files so the
// fetch modules only issue queries and this module owns row → graph shaping.
// ---------------------------------------------------------------------------

interface EventGroup {
  action: string;
  actorType: string | null;
  actorSubType: string | null;
  targetType: string | null;
  targetSubType: string | null;
  isOrigin: boolean;
  isOriginAlert: boolean;
  pinned: string | null;
  badge: number;
  isAlert: boolean;
  docIds: Set<string>;
  alertDocIds: Set<string>;
  nonAlertDocIds: Set<string>;
  docs: Set<string>;
  sourceIps: Set<string>;
  sourceCountryCodes: Set<string>;
  actorEntityIds: Set<string>;
  targetEntityIds: Set<string>;
  actorsDocData: Set<string>;
  targetsDocData: Set<string>;
}

/**
 * Creates an empty EventGroup seeded with the group-key dimensions for a record.
 */
const createEventGroup = (
  record: EventEsqlRow,
  actorType: string | null,
  actorSubType: string | null,
  targetType: string | null,
  targetSubType: string | null,
  pinned: string | null
): EventGroup => ({
  action: record.action,
  actorType,
  actorSubType,
  targetType,
  targetSubType,
  isOrigin: record.isOrigin,
  isOriginAlert: record.isOriginAlert,
  pinned,
  badge: 0,
  isAlert: false,
  docIds: new Set(),
  alertDocIds: new Set(),
  nonAlertDocIds: new Set(),
  docs: new Set(),
  sourceIps: new Set(),
  sourceCountryCodes: new Set(),
  actorEntityIds: new Set(),
  targetEntityIds: new Set(),
  actorsDocData: new Set(),
  targetsDocData: new Set(),
});

/**
 * Parses a "cross-reference" multi-value column into a `Map<key, Set<value>>`.
 *
 * Both the events and relationships queries emit such a column so the TypeScript regroup step can
 * recover a reference that the STATS pre-aggregation dropped from the group key. Each entry is a
 * `"<key>\n<value>"` pair and the values are bucketed by key:
 *  - events collect `targetDocMap` (`"<targetEntityId>\n<documentId>"`) — which document(s)
 *    referenced each target;
 *  - relationships collect `actorTargetMap` (`"<actorId>\n<targetId>"`) — which target(s) each
 *    actor points at.
 *
 * The split is on the first newline only (keys/values — EUIDs, doc ids — never contain one).
 * Entries with an empty value are skipped; an empty key is kept (events use `""` as the
 * "no target" sentinel).
 */
const parseCrossReferenceMap = (column: string | string[]): Map<string, Set<string>> => {
  const entries = Array.isArray(column) ? column : column ? [column] : [];
  const map = new Map<string, Set<string>>();
  for (const entry of entries) {
    if (!entry) continue;
    const sep = entry.indexOf('\n');
    if (sep === -1) continue;
    const key = entry.slice(0, sep);
    const value = entry.slice(sep + 1);
    if (!value) continue;
    let set = map.get(key);
    if (!set) {
      set = new Set();
      map.set(key, set);
    }
    set.add(value);
  }
  return map;
};

/**
 * Returns the set of document _ids that referenced any of the given targets, using the
 * per-target → doc attribution built from targetDocMap. When the group has no targets
 * (targetIdsForGroup empty), falls back to every doc referenced by the row.
 */
const docIdsForTargets = (
  targetDocByTarget: Map<string, Set<string>>,
  targetIdsForGroup: string[]
): Set<string> => {
  const docIds = new Set<string>();
  if (targetIdsForGroup.length === 0) {
    // No-target group ("" sentinel key) — take whatever docs the row attributed to "".
    for (const id of targetDocByTarget.get('') ?? []) docIds.add(id);
    return docIds;
  }
  for (const targetId of targetIdsForGroup) {
    for (const id of targetDocByTarget.get(targetId) ?? []) docIds.add(id);
  }
  return docIds;
};

/**
 * Merges one row's contribution into a group: adds the badge, unions every multi-value
 * column, and records the actor/target IDs that belong to this group from this row.
 * Doc id / doc / doc-data columns are restricted to the documents that referenced this group's
 * targets (via targetDocMap) so that a STATS row shared across multiple target-type groups keeps
 * each group's documents, counts, and label node separate — matching a targetEntityId group key.
 * Doc id / doc-data columns drop the empty-string sentinel; source IP / country keep
 * the historical null-only guard.
 */
const accumulateEventRecord = (
  group: EventGroup,
  record: EventEsqlRow,
  actorIdsForGroup: string[],
  targetIdsForGroup: string[]
): void => {
  group.badge += record.badge;
  group.isAlert = group.isAlert || Boolean(record.isAlert);

  // Restrict this group's documents to the ones that referenced its targets.
  const groupDocIds = docIdsForTargets(
    parseCrossReferenceMap(record.targetDocMap),
    targetIdsForGroup
  );
  const toArray = (v: string | string[] | null | undefined): string[] =>
    Array.isArray(v) ? v : v != null ? [v] : [];
  const keepDoc = (docId: string): boolean => docId !== '' && groupDocIds.has(docId);

  addValuesToSet(group.docIds, [...groupDocIds], { dropEmpty: true });
  addValuesToSet(group.alertDocIds, toArray(record.alertDocIds).filter(keepDoc), {
    dropEmpty: true,
  });
  addValuesToSet(group.nonAlertDocIds, toArray(record.nonAlertDocIds).filter(keepDoc), {
    dropEmpty: true,
  });
  // `docs` entries are JSON strings whose "id" is the source document _id.
  addValuesToSet(group.docs, filterDocDataToIds(record.docs, groupDocIds), { dropEmpty: true });

  const actorIdSet = new Set(actorIdsForGroup);
  const targetIdSet = new Set(targetIdsForGroup);
  addValuesToSet(group.actorsDocData, filterDocDataToIds(record.actorDocData, actorIdSet), {
    dropEmpty: true,
  });
  addValuesToSet(group.targetsDocData, filterDocDataToIds(record.targetDocData, targetIdSet), {
    dropEmpty: true,
  });

  addValuesToSet(group.sourceIps, record.sourceIps, { dropEmpty: false });
  addValuesToSet(group.sourceCountryCodes, record.sourceCountryCodes, { dropEmpty: false });

  for (const id of actorIdsForGroup) group.actorEntityIds.add(id);
  for (const id of targetIdsForGroup) group.targetEntityIds.add(id);
};

/**
 * Buckets the pre-aggregated ES|QL rows into their final EventGroups, keyed by
 * (action, actorType, actorSubType, targetType, targetSubType, isOrigin, isOriginAlert, pinned).
 *
 * Each ES|QL row now covers a full (action, isOrigin, isOriginAlert, pinned) bucket and carries
 * all actor/target entity IDs as multi-value columns. We fan out over the distinct
 * (actorType×targetType) combinations present in the row's entity IDs, contributing
 * record.badge once per combination to avoid double-counting.
 */
const groupEventRecords = (
  records: EventEsqlRow[],
  enrichmentMap: Map<string, EntityEnrichmentFields>
): EventGroup[] => {
  const groups = new Map<string, EventGroup>();

  for (const record of records) {
    const rawActorIds = Array.isArray(record.actorEntityId)
      ? record.actorEntityId
      : record.actorEntityId
      ? [record.actorEntityId]
      : [];
    if (rawActorIds.length === 0) continue;

    const rawTargetIds = Array.isArray(record.targetEntityId)
      ? record.targetEntityId
      : record.targetEntityId
      ? [record.targetEntityId]
      : [];

    const pinned = record.pinned ?? null;

    // Group actor IDs by their (type, subType).
    // Type comes from entity-store enrichment only; unenriched actors get a null type so that
    // all unenriched actors acted on by the same (action, isOrigin, isOriginAlert, pinned) event
    // collapse into a single group regardless of their EUID prefix.
    const actorsByTypeKey = new Map<
      string,
      { type: string | null; subType: string | null; ids: string[] }
    >();
    for (const actorId of rawActorIds) {
      if (!actorId) continue;
      const enrichment = enrichmentMap.get(actorId);
      const actorType = enrichment?.type ?? null;
      const actorSubType = enrichment?.subType ?? null;
      const key = `${actorType}\0${actorSubType}`;
      let entry = actorsByTypeKey.get(key);
      if (!entry) {
        entry = { type: actorType, subType: actorSubType, ids: [] };
        actorsByTypeKey.set(key, entry);
      }
      entry.ids.push(actorId);
    }

    // Group target IDs by their (type, subType) — entity-store enrichment only, so all
    // unenriched targets (null type) collapse into a single group regardless of EUID prefix.
    const targetsByTypeKey = new Map<
      string,
      { type: string | null; subType: string | null; ids: string[] }
    >();
    if (rawTargetIds.length === 0) {
      targetsByTypeKey.set('null\0null', { type: null, subType: null, ids: [] });
    } else {
      for (const targetId of rawTargetIds) {
        if (!targetId) continue;
        const enrichment = enrichmentMap.get(targetId);
        const targetType = enrichment?.type ?? null;
        const targetSubType = enrichment?.subType ?? null;
        const key = `${targetType}\0${targetSubType}`;
        let entry = targetsByTypeKey.get(key);
        if (!entry) {
          entry = { type: targetType, subType: targetSubType, ids: [] };
          targetsByTypeKey.set(key, entry);
        }
        entry.ids.push(targetId);
      }
    }

    // For each (actorType × targetType) combination, contribute to a group
    for (const actorEntry of actorsByTypeKey.values()) {
      for (const targetEntry of targetsByTypeKey.values()) {
        const groupKey = JSON.stringify([
          record.action,
          actorEntry.type,
          actorEntry.subType,
          targetEntry.type,
          targetEntry.subType,
          record.isOrigin,
          record.isOriginAlert,
          pinned,
        ]);

        let group = groups.get(groupKey);
        if (!group) {
          group = createEventGroup(
            record,
            actorEntry.type,
            actorEntry.subType,
            targetEntry.type,
            targetEntry.subType,
            pinned
          );
          groups.set(groupKey, group);
        }

        accumulateEventRecord(group, record, actorEntry.ids, targetEntry.ids);
      }
    }
  }

  return [...groups.values()];
};

/**
 * Re-groups the STATS-pre-aggregated ES|QL rows by (action, actorType, actorSubType,
 * targetType, targetSubType, isOrigin, isOriginAlert, pinned) using entity-store enrichment
 * for type/sub_type. The ES|QL query already pre-aggregates per entity-pair (badge counts,
 * multi-value docs/docIds/sourceIps/…) to keep row count below the 10,000-row hard cap; this
 * function performs the final merge by entity type/sub-type — which is only known after the
 * follow-up enrichment query — summing badges and unioning the multi-value columns.
 *
 * Does NOT rebuild docData — raw ESQL JSON strings are passed through as-is. Use
 * enrichEventDocData afterwards to apply entity-store enrichment to docData payloads.
 */
export const regroupEvents = (
  records: EventEsqlRow[],
  enrichmentMap: Map<string, EntityEnrichmentFields>
): EventEdge[] => {
  const result = groupEventRecords(records, enrichmentMap).map((group): EventEdge => {
    const actorEntityIds = [...group.actorEntityIds];
    const targetEntityIds = [...group.targetEntityIds];

    const actorNodeId = actorEntityIds.length === 1 ? actorEntityIds[0] : hashIds(actorEntityIds);
    const targetNodeId =
      targetEntityIds.length === 0
        ? null
        : targetEntityIds.length === 1
        ? targetEntityIds[0]
        : hashIds(targetEntityIds);

    const docIds = [...group.docIds];
    // Label node is keyed on this group's own documents (already restricted, via targetDocMap, to
    // the docs that referenced this group's targets). Two target-type groups that share the exact
    // same documents therefore share one label node that fans out to both targets; groups backed
    // by different documents get separate label nodes — matching a targetEntityId group key.
    const labelNodeId = docIds.length === 1 ? docIds[0] : hashIds(docIds);

    const actorNames = actorEntityIds
      .map((id) => enrichmentMap.get(id)?.name)
      .filter((n): n is string => n != null);
    const actorHostIps = [
      ...new Set(actorEntityIds.flatMap((id) => enrichmentMap.get(id)?.hostIps ?? [])),
    ];

    const targetNames = targetEntityIds
      .map((id) => enrichmentMap.get(id)?.name)
      .filter((n): n is string => n != null);
    const targetHostIps = [
      ...new Set(targetEntityIds.flatMap((id) => enrichmentMap.get(id)?.hostIps ?? [])),
    ];

    const sourceIps = [...group.sourceIps];
    const sourceCountryCodes = [...group.sourceCountryCodes];

    return {
      action: group.action,
      badge: group.badge,
      uniqueEventsCount: group.nonAlertDocIds.size,
      uniqueAlertsCount: group.alertDocIds.size,
      isAlert: group.isAlert,
      isOrigin: group.isOrigin,
      isOriginAlert: group.isOriginAlert,
      pinned: group.pinned,
      labelNodeId,
      docs: [...group.docs],
      sourceIps: sourceIps.length > 0 ? sourceIps : undefined,
      sourceCountryCodes: sourceCountryCodes.length > 0 ? sourceCountryCodes : undefined,
      actorNodeId,
      actorIdsCount: actorEntityIds.length,
      actorEntityType: group.actorType,
      actorEntitySubType: group.actorSubType,
      actorEntityName:
        actorNames.length === 0 ? null : actorNames.length === 1 ? actorNames[0] : actorNames,
      actorHostIps: actorHostIps.length > 0 ? actorHostIps : undefined,
      actorsDocData: [...group.actorsDocData],
      targetNodeId,
      targetIdsCount: targetEntityIds.length,
      targetEntityType: group.targetType,
      targetEntitySubType: group.targetSubType,
      targetEntityName:
        targetNames.length === 0 ? null : targetNames.length === 1 ? targetNames[0] : targetNames,
      targetHostIps: targetHostIps.length > 0 ? targetHostIps : undefined,
      targetsDocData: [...group.targetsDocData],
    };
  });

  result.sort((a, b) => {
    if (a.action > b.action) return -1;
    if (a.action < b.action) return 1;
    const aPinned = a.pinned ? 0 : 1;
    const bPinned = b.pinned ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;
    return (b.isOrigin ? 1 : 0) - (a.isOrigin ? 1 : 0);
  });

  return result;
};

/**
 * Rebuilds actorsDocData and targetsDocData for each event using entity store enrichment.
 * Applies rebuildDocData to each event's actorsDocData and targetsDocData arrays.
 * This is a separate step from regroupEvents, allowing enrichment to be applied after grouping.
 */
export const enrichEventDocData = (
  events: EventEdge[],
  enrichmentMap: Map<string, EntityEnrichmentFields>
): EventEdge[] => {
  return events.map((event) => ({
    ...event,
    actorsDocData: rebuildDocData(event.actorsDocData, enrichmentMap),
    targetsDocData: rebuildDocData(event.targetsDocData, enrichmentMap),
  }));
};

interface RelationshipGroup {
  actorIds: Set<string>;
  actorEntityType: string | null | undefined;
  actorEntitySubType: string | null | undefined;
  actorEntityName: string | string[] | null | undefined;
  actorsDocData: Set<string>;
  relationship: string;
  targetType: string | null;
  targetSubType: string | null;
  badge: number;
  targetIds: Set<string>;
  targetsDocData: Set<string>;
}

/**
 * Groups per-triple relationship rows by (actorEntityType, actorEntitySubType, relationship,
 * targetType, targetSubType) — NOT by raw actorId. Two actors of the same type sharing the
 * same relationship and target type produce one relationship node instead of two.
 *
 * Pinned actors are always isolated into their own group (never merged with others) so that
 * pinned entities always appear as individual nodes in the graph.
 *
 * Actor type/sub_type and name come directly off the row (the entity store IS the actor source).
 * All aggregation (badge, actorIdsCount, targetIdsCount, targetIds collection, host IPs) is
 * computed in TypeScript.
 *
 * Does NOT rebuild docData — raw ESQL JSON strings are passed through as-is. Use
 * enrichRelationshipDocData afterwards to apply entity-store enrichment to docData payloads.
 */
export const regroupRelationships = (
  records: RelationshipEsqlRow[],
  enrichmentMap: Map<string, EntityEnrichmentFields>
): RelationshipEdge[] => {
  const groups = new Map<string, RelationshipGroup>();

  for (const record of records) {
    const rawActorIds = Array.isArray(record.actorIds)
      ? record.actorIds
      : record.actorIds
      ? [record.actorIds]
      : [];
    if (rawActorIds.length === 0) continue;

    // Pinned actors/targets are isolated into their own group via the ES|QL pinned column —
    // same pattern as regroupEvents in fetch_events_graph.ts.
    const pinned = record.pinned ?? null;

    // Recover which actor pointed at which target (STATS no longer keys on actorId/targetId).
    const targetsByActor = parseCrossReferenceMap(record.actorTargetMap);

    // Partition the row's same-type actors by the SET of targets they point at. Actors that share
    // the exact same target set collapse into one relationship node; actors with different target
    // sets (e.g. two Services communicating with different entities) split into separate nodes.
    // The partition signature is the hash of the actor's sorted target IDs.
    const partitions = new Map<string, { actorIds: string[]; targetIds: Set<string> }>();
    for (const actorId of rawActorIds) {
      if (!actorId) continue;
      const targetIds = [...(targetsByActor.get(actorId) ?? [])].sort((a, b) => a.localeCompare(b));
      const signature = hashIds(targetIds);
      let partition = partitions.get(signature);
      if (!partition) {
        partition = { actorIds: [], targetIds: new Set(targetIds) };
        partitions.set(signature, partition);
      }
      partition.actorIds.push(actorId);
    }

    for (const [partitionSignature, partition] of partitions) {
      // Within a partition, bucket the targets by their entity-store (type, subType) — same-type
      // targets collapse into one grouped target node; different-type targets split into groups.
      const targetsByTypeKey = new Map<
        string,
        { type: string | null; subType: string | null; ids: string[] }
      >();
      for (const targetId of partition.targetIds) {
        if (!targetId) continue;
        const targetEnrichment = enrichmentMap.get(targetId);
        const targetType = targetEnrichment?.type ?? null;
        const targetSubType = targetEnrichment?.subType ?? null;
        const key = `${targetType}\0${targetSubType}`;
        let entry = targetsByTypeKey.get(key);
        if (!entry) {
          entry = { type: targetType, subType: targetSubType, ids: [] };
          targetsByTypeKey.set(key, entry);
        }
        entry.ids.push(targetId);
      }

      const actorIdSet = new Set(partition.actorIds);

      for (const targetEntry of targetsByTypeKey.values()) {
        // partitionSignature keeps actors that point at different target sets in separate groups,
        // so their relationship nodes (rel(<actorKey>-<relationship>)) never merge.
        const groupKey = JSON.stringify([
          pinned,
          record.actorEntityType ?? null,
          record.actorEntitySubType ?? null,
          record.relationship,
          targetEntry.type,
          targetEntry.subType,
          partitionSignature,
        ]);

        let group = groups.get(groupKey);
        if (!group) {
          group = {
            actorIds: new Set(),
            actorEntityType: record.actorEntityType,
            actorEntitySubType: record.actorEntitySubType,
            actorEntityName: record.actorEntityName,
            actorsDocData: new Set(),
            relationship: record.relationship,
            targetType: targetEntry.type,
            targetSubType: targetEntry.subType,
            badge: 0,
            targetIds: new Set(),
            targetsDocData: new Set(),
          };
          groups.set(groupKey, group);
        }

        // Sum the collapsed counts and union the multi-value columns. actorsDocData / targetsDocData
        // are filtered to only this partition's actors and this type group's targets so a shared
        // STATS row doesn't leak doc data across groups. Doc-data drops the empty-string sentinel;
        // host IPs keep the historical null-only guard.
        group.badge += record.badge;
        for (const id of partition.actorIds) group.actorIds.add(id);
        for (const id of targetEntry.ids) group.targetIds.add(id);
        addValuesToSet(group.actorsDocData, filterDocDataToIds(record.actorDocData, actorIdSet), {
          dropEmpty: true,
        });
        addValuesToSet(
          group.targetsDocData,
          filterDocDataToIds(record.targetDocData, new Set(targetEntry.ids)),
          { dropEmpty: true }
        );
      }
    }
  }

  return Array.from(groups.values()).map((group): RelationshipEdge => {
    const actorIds = [...group.actorIds].sort((a, b) => a.localeCompare(b));
    // Single actor: use raw entity ID (preserves rel(entity.id-relationship) format).
    // Multiple actors: hash of sorted IDs — consistent with actorNodeId/targetNodeId
    // grouping pattern in fetch_events_graph.ts.
    const actorKey = actorIds.length === 1 ? actorIds[0] : hashIds(actorIds);
    const actorNodeId = actorKey;

    const targetIds = [...group.targetIds].sort((a, b) => a.localeCompare(b));
    const targetNodeId =
      targetIds.length === 0 ? '' : targetIds.length === 1 ? targetIds[0] : hashIds(targetIds);

    const targetNames = targetIds
      .map((id) => enrichmentMap.get(id)?.name)
      .filter((n): n is string => n != null);
    const targetHostIps = [
      ...new Set(targetIds.flatMap((id) => enrichmentMap.get(id)?.hostIps ?? [])),
    ];

    // Resolve actor name and host IPs per actor from the entity store rather than from the
    // row-level MV_FIRST(actorEntityName) / VALUES(actorHostIps): when a STATS row merges several
    // same-type actors, those row-level values cover ALL merged actors, which would mislabel /
    // leak IPs across the nodes produced when the row is partitioned by target set. Resolving
    // per-actor keeps each node scoped to its own actors (consistent with targetHostIps).
    const actorNames = actorIds
      .map((id) => enrichmentMap.get(id)?.name)
      .filter((n): n is string => n != null);
    const actorHostIps = [
      ...new Set(actorIds.flatMap((id) => enrichmentMap.get(id)?.hostIps ?? [])),
    ];

    // relationshipNodeId drives rel(...) node ID in parse_records.ts.
    // Single actor: "entity.id-relationship" (unchanged format, no test regression).
    // Merged actors: "<hashIds(actorIds)>-relationship".
    const relationshipNodeId = `${actorKey}-${group.relationship}`;

    return {
      badge: group.badge,
      actorNodeId,
      actorIdsCount: actorIds.length,
      actorEntityType: group.actorEntityType,
      actorEntitySubType: group.actorEntitySubType,
      actorEntityName:
        actorNames.length === 0
          ? group.actorEntityName ?? null
          : actorNames.length === 1
          ? actorNames[0]
          : actorNames,
      actorHostIps: actorHostIps.length > 0 ? actorHostIps : undefined,
      actorsDocData: [...group.actorsDocData],
      targetNodeId,
      targetIdsCount: targetIds.length,
      targetEntityType: group.targetType,
      targetEntitySubType: group.targetSubType,
      targetEntityName:
        targetNames.length === 0 ? null : targetNames.length === 1 ? targetNames[0] : targetNames,
      targetHostIps: targetHostIps.length > 0 ? targetHostIps : undefined,
      targetsDocData: [...group.targetsDocData],
      relationship: group.relationship,
      relationshipNodeId,
      actorIds,
      targetIds,
    };
  });
};

/**
 * Rebuilds targetsDocData for each relationship using entity store enrichment.
 * actorsDocData is intentionally left unchanged: relationship actor docData is already
 * built inline in the ES|QL query with full entity metadata (the actor IS the
 * entity-store source row). Only target entities need TypeScript-side enrichment.
 */
export const enrichRelationshipDocData = (
  relationships: RelationshipEdge[],
  enrichmentMap: Map<string, EntityEnrichmentFields>
): RelationshipEdge[] => {
  return relationships.map((rel) => ({
    ...rel,
    targetsDocData: rebuildDocData(rel.targetsDocData, enrichmentMap),
  }));
};

/**
 * Applies enrichment to entity records from the entity store.
 */
export const enrichEntityRecords = (
  records: EntityRecord[],
  enrichmentMap: Map<string, EntityEnrichmentFields>
): EntityRecord[] => {
  return records.map((record) => {
    const enrichment = enrichmentMap.get(record.id);
    if (!enrichment) return record;
    return {
      ...record,
      name: enrichment.name ?? record.name,
      type: enrichment.type ?? record.type,
      sub_type: enrichment.subType ?? record.sub_type,
    };
  });
};
