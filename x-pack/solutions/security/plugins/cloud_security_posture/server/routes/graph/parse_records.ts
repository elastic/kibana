/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { castArray } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { ApiMessageCode } from '@kbn/cloud-security-posture-common/types/graph/latest';
import type {
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
import {
  type LabelNodeId,
  type GraphEdge,
  type RelationshipEdge,
  NON_ENRICHED_ENTITY_TYPE_PLURAL,
  NON_ENRICHED_ENTITY_TYPE_SINGULAR,
} from './types';
import { transformEntityTypeToIconAndShape } from './utils';
import { createHash } from 'node:crypto';

interface ConnectorEdges {
  source: string;
  target: string;
  edgeType: EdgeDataModel['type'];
}

/**
 * Relationship connector edges - supports multiple sources and targets for consolidated relationship nodes.
 * Each source+relationship combination gets one node that connects to all targets.
 */
interface RelationshipConnectorEdges {
  source: string; // Source entity for this relationship (relationshipNodeId = entityId-relationship)
  targets: string[]; // All targets for this source+relationship combination
  edgeType: EdgeDataModel['type'];
}

interface ParseContext {
  readonly nodesLimit?: number;
  readonly nodesMap: Record<string, NodeDataModel>;
  readonly edgesMap: Record<string, EdgeDataModel>;
  // Label nodes (events/actions)
  readonly relationshipEdges: Record<string, RelationshipConnectorEdges>;
  /**
   * Used to group multiple labels that share the same document set.
   */
  readonly edgeLabelsNodes: Record<LabelNodeId, LabelNodeId[]>;
  /**
   * Maps label node ID to array of edges (source-target pairs).
   * A single label can connect to multiple actor-target pairs when
   * MV_EXPAND creates multiple rows from the same document(s).
   */
  readonly labelEdges: Record<LabelNodeId, ConnectorEdges[]>;
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
  records: GraphEdge[],
  relationshipRecords: RelationshipEdge[],
  nodesLimit?: number
): Pick<GraphResponse, 'nodes' | 'edges' | 'messages'> => {
  const ctx: ParseContext = {
    nodesLimit,
    logger,
    nodesMap: {},
    edgeLabelsNodes: {},
    edgesMap: {},
    labelEdges: {},
    relationshipEdges: {},
    messages: [],
  };

  logger.trace(
    `Parsing records [events: ${records.length}] [relationships: ${
      relationshipRecords.length
    }] [nodesLimit: ${nodesLimit ?? 'none'}]`
  );

  createNodes(records, ctx);

  // Process relationships
  createRelationshipNodes(relationshipRecords, ctx);

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

const createGroupedActorAndTargetNodes = (
  record: GraphEdge,
  context: ParseContext
): {
  actorId: string;
  targetId: string;
} => {
  const { nodesMap } = context;
  const {
    // actor attributes
    actorNodeId,
    actorIdsCount,
    actorsDocData,
    actorEntityType: rawActorEntityType,
    actorEntitySubType,
    actorEntityName,
    actorHostIps,
    // target attributes
    targetNodeId,
    targetIdsCount,
    targetsDocData,
    targetEntityType: rawTargetEntityType,
    targetEntitySubType,
    targetEntityName,
    targetHostIps,
  } = record;

  const actorHostIpsArray = actorHostIps ? castArray(actorHostIps) : [];
  const targetHostIpsArray = targetHostIps ? castArray(targetHostIps) : [];

  // Resolve entity types and labels using utility functions
  const actorEntityType = resolveEntityType(rawActorEntityType, actorIdsCount);
  const targetEntityType = resolveEntityType(rawTargetEntityType, targetIdsCount);

  const actorLabel = generateEntityLabel(
    actorIdsCount,
    actorNodeId,
    actorEntityType,
    actorEntityName,
    actorEntitySubType
  );

  const targetLabel = generateEntityLabel(
    targetIdsCount,
    targetNodeId || '',
    targetEntityType,
    targetEntityName,
    targetEntitySubType
  );

  const actorsDocDataArray: NodeDocumentDataModel[] = actorsDocData
    ? castArray(actorsDocData)
        .filter((actorData): actorData is string => actorData !== null && actorData !== undefined)
        .map((actorData) => JSON.parse(actorData))
    : [];

  const targetsDocDataArray: NodeDocumentDataModel[] = targetsDocData
    ? castArray(targetsDocData)
        .filter(
          (targetData): targetData is string => targetData !== null && targetData !== undefined
        )
        .map((targetData) => JSON.parse(targetData))
    : [];

  const actorGroup: {
    id: string;
    type: string;
    count?: number;
    docData: NodeDocumentDataModel[];
    hostIps: string[];
    label?: string;
  } = {
    id: actorNodeId, // Actor: Always use node ID from ES|QL (single entity ID or MD5 hash)
    type: actorEntityType,
    docData: actorsDocDataArray,
    hostIps: actorHostIpsArray,
    ...(actorIdsCount > 1 ? { count: actorIdsCount } : {}),
    ...(actorLabel && actorLabel !== '' ? { label: actorLabel } : {}),
  };

  const targetGroup: {
    id: string;
    type: string;
    count?: number;
    docData: NodeDocumentDataModel[];
    hostIps: string[];
    label?: string;
  } =
    targetIdsCount > 0 && targetNodeId
      ? {
          id: targetNodeId,
          type: targetEntityType,
          docData: targetsDocDataArray,
          hostIps: targetHostIpsArray,
          ...(targetIdsCount > 1 ? { count: targetIdsCount } : {}),
          ...(targetLabel && targetLabel !== '' ? { label: targetLabel } : {}),
        }
      : {
          // Unknown target
          id: `unknown-${uuidv4()}`,
          type: '',
          label: 'Unknown',
          docData: [],
          hostIps: [],
        };

  [actorGroup, targetGroup].forEach(({ id, label, type, count, docData, hostIps }) => {
    if (nodesMap[id] === undefined) {
      nodesMap[id] = {
        id,
        color: 'primary' as const,
        ...(label ? { label } : {}),
        documentsData: docData,
        ...deriveEntityAttributesFromType(type),
        ...(count && count > 1 ? { count } : {}),
        ...(hostIps.length > 0 ? { ips: hostIps } : {}),
      };
    }
  });

  return {
    actorId: actorGroup.id,
    targetId: targetGroup.id,
  };
};

const createLabelNode = (record: GraphEdge): LabelNodeDataModel => {
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

const processLabelNodes = (
  context: ParseContext,
  nodeData: {
    labelNodeId: string;
    sourceId: string;
    targetId: string;
    labelNode: LabelNodeDataModel;
  }
) => {
  const { nodesMap, edgeLabelsNodes, labelEdges } = context;
  const { labelNodeId, sourceId, targetId, labelNode } = nodeData;

  // Group labels by labelNodeId (document-based)
  if (edgeLabelsNodes[labelNodeId] === undefined) {
    edgeLabelsNodes[labelNodeId] = [];
  }

  // Only add the label node if it doesn't exist yet
  if (nodesMap[labelNode.id] === undefined) {
    nodesMap[labelNode.id] = labelNode;
    edgeLabelsNodes[labelNodeId].push(labelNode.id);
    labelEdges[labelNode.id] = [];
  }

  // Add the edge (source-target pair) for this label node
  labelEdges[labelNode.id].push({
    source: sourceId,
    target: targetId,
    edgeType: 'solid',
  });
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

const createNodes = (records: GraphEdge[], context: ParseContext) => {
  for (const record of records) {
    if (isAboveAPINodesLimit(context)) {
      emitAPINodesLimitMessage(context);
      break;
    }

    const { actorId, targetId } = createGroupedActorAndTargetNodes(record, context);
    const { labelNodeId } = record;
    const labelNode = createLabelNode(record);

    processLabelNodes(context, {
      labelNodeId,
      sourceId: actorId,
      targetId,
      labelNode,
    });
  }
};

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
    label: relationship.replace(/_/g, ' '), // "Depends_on" -> "Depends on"
    shape: 'relationship',
  };
};

/**
 * Processes relationship nodes with consolidation.
 * Each source+relationship combination gets one node that connects to all targets.
 */
const processRelationshipNodes = (
  context: ParseContext,
  nodeData: {
    sourceId: string;
    targetIds: string[]; // All targets for this source+relationship
    relationshipNode: RelationshipNodeDataModel;
  }
) => {
  const { nodesMap, relationshipEdges } = context;
  const { sourceId, targetIds, relationshipNode } = nodeData;

  // Check if this relationship node already exists (relationshipNodeId = sourceId-relationship)
  const existingEdges = relationshipEdges[relationshipNode.id];
  if (existingEdges) {
    // Add any new targets (source is always the same for a given relationship node ID)
    targetIds.forEach((targetId) => {
      if (!existingEdges.targets.includes(targetId)) {
        existingEdges.targets.push(targetId);
      }
    });
  } else {
    // Create new relationship node
    nodesMap[relationshipNode.id] = relationshipNode;
    relationshipEdges[relationshipNode.id] = {
      source: sourceId,
      targets: targetIds,
      edgeType: 'solid',
    };
  }
};

/**
 * Parses entity doc data JSON and creates an enriched entity node.
 * Used for both source and target entities from relationship records.
 */
const parseEntityDocData = (
  targetId: string,
  targetDocDataJson: string | undefined
): EntityNodeDataModel => {
  let entityData: NodeDocumentDataModel | undefined;
  let label = targetId;
  let entityType: string | undefined;

  if (targetDocDataJson) {
    try {
      entityData = JSON.parse(targetDocDataJson) as NodeDocumentDataModel;
      // Use entity name as label if available
      if (entityData?.entity?.name) {
        label = entityData.entity.name;
      }
      entityType = entityData?.entity?.type;
    } catch {
      // If parsing fails, use targetId as label
    }
  }

  // Derive visual properties from entity type
  const visualProps = entityType
    ? deriveEntityAttributesFromType(entityType)
    : { shape: 'rectangle' as const };

  return {
    id: targetId,
    label,
    color: 'primary',
    ...visualProps,
    ...(entityType && { tag: entityType }),
    documentsData: entityData ? [entityData] : undefined,
  } as EntityNodeDataModel;
};

/**
 * Creates relationship nodes from relationship records.
 * Source entities are grouped by type/subtype (similar to event actors).
 */
const createRelationshipNodes = (
  relationshipRecords: RelationshipEdge[],
  context: ParseContext
) => {
  for (const record of relationshipRecords) {
    if (isAboveAPINodesLimit(context)) {
      emitAPINodesLimitMessage(context);
      break;
    }

    // Create or update source entity node (may be grouped)
    // Use sourceNodeId for the node key (can be a single ID or MD5 hash for grouped entities)
    const sourceNodeId = record.sourceNodeId;

    if (!context.nodesMap[sourceNodeId]) {
      // For grouped entities (count > 1), create a grouped node
      if (record.sourceIdsCount > 1) {
        // Parse all source doc data to collect documents and entity names
        const documentsData: NodeDocumentDataModel[] = [];
        const entityNames: string[] = [];
        castArray(record.sourceDocData).forEach((docDataJson) => {
          try {
            const docData = JSON.parse(docDataJson) as NodeDocumentDataModel;
            documentsData.push(docData);
            if (docData.entity?.name) {
              entityNames.push(docData.entity.name);
            }
          } catch {
            // Skip invalid JSON
          }
        });

        // Get visual props from entity type with fallback
        const visualProps = transformEntityTypeToIconAndShape(record.sourceEntityType ?? '');
        const shape = visualProps.shape ?? 'recantgle';

        // Generate label using same logic as events
        const label = generateEntityLabel(
          record.sourceIdsCount,
          sourceNodeId,
          record.sourceEntityType ?? '',
          entityNames.length > 0 ? entityNames : null,
          record.sourceEntitySubType ?? null
        );

        context.nodesMap[sourceNodeId] = {
          id: sourceNodeId,
          label,
          color: 'primary',
          shape,
          ...(visualProps.icon && { icon: visualProps.icon }),
          ...(record.sourceEntityType && { tag: record.sourceEntityType }),
          ...(record.sourceIdsCount > 1 && { count: record.sourceIdsCount }),
          documentsData,
        } as EntityNodeDataModel;
      } else {
        // Single entity - use the first source doc data
        const sourceDocDataJson = castArray(record.sourceDocData)[0];
        context.nodesMap[sourceNodeId] = parseEntityDocData(sourceNodeId, sourceDocDataJson);
      }
    }

    // Create or update target entity node (may be grouped by type/subtype)
    // Use targetNodeId for the node key (can be a single ID or MD5 hash for grouped entities)
    const targetNodeId = record.targetNodeId;

    if (!context.nodesMap[targetNodeId]) {
      // For grouped entities (count > 1), create a grouped node
      if (record.targetIdsCount > 1) {
        // Parse all target doc data to collect documents and entity names
        const documentsData: NodeDocumentDataModel[] = [];
        const entityNames: string[] = [];
        castArray(record.targetDocData).forEach((docDataJson) => {
          try {
            const docData = JSON.parse(docDataJson) as NodeDocumentDataModel;
            documentsData.push(docData);
            if (docData.entity?.name) {
              entityNames.push(docData.entity.name);
            }
          } catch {
            // Skip invalid JSON
          }
        });

        // Get visual props from entity type with fallback
        const visualProps = transformEntityTypeToIconAndShape(record.targetEntityType ?? '');
        const shape = visualProps.shape ?? 'rectangle';

        // Generate label using same logic as events
        const label = generateEntityLabel(
          record.targetIdsCount,
          targetNodeId,
          record.targetEntityType ?? '',
          entityNames.length > 0 ? entityNames : null,
          record.targetEntitySubType ?? null
        );

        context.nodesMap[targetNodeId] = {
          id: targetNodeId,
          label,
          color: 'primary',
          shape,
          ...(visualProps.icon && { icon: visualProps.icon }),
          ...(record.targetEntityType && { tag: record.targetEntityType }),
          ...(record.targetIdsCount > 1 && { count: record.targetIdsCount }),
          documentsData,
        } as EntityNodeDataModel;
      } else {
        // Single entity - use the first target doc data
        const targetDocDataJson = castArray(record.targetDocData)[0];
        context.nodesMap[targetNodeId] = parseEntityDocData(targetNodeId, targetDocDataJson);
      }
    }

    // Create relationship node - ID is based on source + relationship (relationshipNodeId)
    // so each source+relationship combination gets one node that connects to all target groups
    const relationshipNode = createRelationshipNode(record.relationshipNodeId, record.relationship);

    processRelationshipNodes(context, {
      sourceId: sourceNodeId,
      targetIds: [targetNodeId], // Pass the grouped targetNodeId
      relationshipNode,
    });
  }
};

const sortNodes = (nodesMap: Record<string, NodeDataModel>) => {
  const groupNodes: NodeDataModel[] = [];
  const connectorNodes: NodeDataModel[] = [];
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
  edgeId: string,
  connectorIds: string[],
  connectorEdgesMap: Record<string, ConnectorEdges[]>,
  edgesMap: Record<string, EdgeDataModel>,
  nodesMap: Record<string, NodeDataModel>,
  connectorType: 'label' | 'relationship'
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
      id: `grp(${edgeId})`,
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
  const { edgeLabelsNodes, edgesMap, nodesMap, labelEdges, relationshipEdges } = context;

  // Process label nodes (events) - existing logic
  Object.entries(edgeLabelsNodes).forEach(([edgeId, edgeLabelsIds]) => {
    processConnectorGroup(edgeId, edgeLabelsIds, labelEdges, edgesMap, nodesMap, 'label');
  });

  // Build grouping and connector edges from relationshipEdges
  // Grouping is computed here (after parsing) because we need all targets accumulated
  const relationshipGrouping: Record<string, string[]> = {};
  const relationshipConnectorEdges: Record<string, ConnectorEdges[]> = {};

  Object.entries(relationshipEdges).forEach(([relNodeId, edges]) => {
    // Compute grouping key from final accumulated targets
    // Relationship nodes with same source AND same targets get stacked
    const sortedTargets = [...edges.targets].sort().join(',');
    const groupingKey = `${edges.source}-${createHash('md5').update(sortedTargets).digest('hex')}`;

    // Build grouping map
    if (!relationshipGrouping[groupingKey]) {
      relationshipGrouping[groupingKey] = [];
    }
    relationshipGrouping[groupingKey].push(relNodeId);

    // Convert to ConnectorEdges[] format for processConnectorGroup
    relationshipConnectorEdges[relNodeId] = edges.targets.map((targetId) => ({
      source: edges.source,
      target: targetId,
      edgeType: edges.edgeType,
    }));
  });

  // Process relationship nodes using processConnectorGroup (handles stacking)
  Object.entries(relationshipGrouping).forEach(([groupKey, relationshipNodeIds]) => {
    processConnectorGroup(
      groupKey,
      relationshipNodeIds,
      relationshipConnectorEdges,
      edgesMap,
      nodesMap,
      'relationship'
    );
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
