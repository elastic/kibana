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
  type GraphEdge,
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

/**
 * Relationship connector edges - supports multiple sources for consolidated relationship nodes.
 * When multiple entities have the same relationship with the same target, they share a single
 * relationship node with edges from all sources to that node.
 */
interface RelationshipConnectorEdges {
  sources: string[]; // Multiple sources can connect to the same relationship node
  target: string;
  edgeType: EdgeDataModel['type'];
}

interface ParseContext {
  readonly nodesLimit?: number;
  readonly nodesMap: Record<string, NodeDataModel>;
  readonly edgesMap: Record<string, EdgeDataModel>;
  // Label nodes (events/actions)
  readonly edgeLabelsNodes: Record<string, string[]>;
  readonly labelEdges: Record<string, ConnectorEdges>;
  // Relationship nodes - consolidated by relationship + target
  readonly relationshipEdges: Record<string, RelationshipConnectorEdges>;
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

  return {
    nodes,
    edges: Object.values(ctx.edgesMap),
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

const createLabelNode = (record: GraphEdge, edgeId: string): LabelNodeDataModel => {
  const {
    action,
    docs,
    isAlert,
    isOrigin,
    isOriginAlert,
    badge,
    uniqueEventsCount,
    uniqueAlertsCount,
    sourceIps,
    sourceCountryCodes,
  } = record;

  const labelId = edgeId + `label(${action})oe(${isOrigin ? 1 : 0})oa(${isOriginAlert ? 1 : 0})`;
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
    edgeId: string;
    sourceId: string;
    targetId: string;
    labelNode: LabelNodeDataModel;
  }
) => {
  const { nodesMap, edgeLabelsNodes, labelEdges } = context;
  const { edgeId, sourceId, targetId, labelNode } = nodeData;
  if (edgeLabelsNodes[edgeId] === undefined) {
    edgeLabelsNodes[edgeId] = [];
  }

  nodesMap[labelNode.id] = labelNode;
  edgeLabelsNodes[edgeId].push(labelNode.id);
  labelEdges[labelNode.id] = {
    source: sourceId,
    target: targetId,
    edgeType: 'solid',
  };
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

    const edgeId = `a(${actorId})-b(${targetId})`;
    const labelNode = createLabelNode(record, edgeId);

    processLabelNodes(context, {
      edgeId,
      sourceId: actorId,
      targetId,
      labelNode,
    });
  }
};

/**
 * Creates a relationship node for static/configuration-based relationships.
 * The node ID is based on relationship + targetId to consolidate nodes when
 * multiple sources have the same relationship with the same target.
 */
const createRelationshipNode = (
  relationship: string,
  targetId: string
): RelationshipNodeDataModel => {
  return {
    id: `rel(${relationship})-target(${targetId})`,
    label: relationship.replace(/_/g, ' '), // "Depends_on" -> "Depends on"
    shape: 'relationship',
  };
};

/**
 * Processes relationship nodes with consolidation.
 * Multiple sources with the same relationship to the same target share a single node.
 */
const processRelationshipNodes = (
  context: ParseContext,
  nodeData: {
    sourceId: string;
    targetId: string;
    relationshipNode: RelationshipNodeDataModel;
  }
) => {
  const { nodesMap, relationshipEdges } = context;
  const { sourceId, targetId, relationshipNode } = nodeData;

  // Check if this relationship node already exists (consolidation)
  const existingEdges = relationshipEdges[relationshipNode.id];
  if (existingEdges) {
    // Add this source to the existing node's sources if not already present
    if (!existingEdges.sources.includes(sourceId)) {
      existingEdges.sources.push(sourceId);
    }
  } else {
    // Create new relationship node
    nodesMap[relationshipNode.id] = relationshipNode;
    relationshipEdges[relationshipNode.id] = {
      sources: [sourceId],
      target: targetId,
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
  let entitySubType: string | undefined;

  if (targetDocDataJson) {
    try {
      entityData = JSON.parse(targetDocDataJson) as NodeDocumentDataModel;
      // Use entity name as label if available
      if (entityData?.entity?.name) {
        label = entityData.entity.name;
      }
      entityType = entityData?.entity?.type;
      entitySubType = entityData?.entity?.sub_type;
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
        record.sourceDocData?.forEach((docDataJson) => {
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
        const sourceDocDataJson = record.sourceDocData?.[0];
        context.nodesMap[sourceNodeId] = parseEntityDocData(sourceNodeId, sourceDocDataJson);
      }
    }

    // Create or update target entity node (may be grouped)
    // Use targetNodeId for the node key (can be a single ID or MD5 hash for grouped entities)
    const targetNodeId = record.targetNodeId;

    if (!context.nodesMap[targetNodeId]) {
      // For grouped entities (count > 1), create a grouped node
      if (record.targetIdsCount > 1) {
        // Parse all target doc data to collect documents and entity names
        const documentsData: NodeDocumentDataModel[] = [];
        const entityNames: string[] = [];
        record.targetDocData?.forEach((docDataJson) => {
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
        const targetDocDataJson = record.targetDocData?.[0];
        context.nodesMap[targetNodeId] = parseEntityDocData(targetNodeId, targetDocDataJson);
      }
    }

    // Create relationship node - ID is based on relationship + targetNodeId
    // so multiple sources with the same relationship to the same target share a node
    const relationshipNode = createRelationshipNode(record.relationship, targetNodeId);

    processRelationshipNodes(context, {
      sourceId: sourceNodeId,
      targetId: targetNodeId,
      relationshipNode,
    });
  }
};

const sortNodes = (nodesMap: Record<string, NodeDataModel>) => {
  const groupNodes = [];
  const otherNodes = [];

  for (const node of Object.values(nodesMap)) {
    if (node.shape === 'group') {
      groupNodes.push(node);
    } else {
      otherNodes.push(node);
    }
  }

  return [...groupNodes, ...otherNodes];
};

/**
 * Helper to process either label or relationship connector groups.
 */
const processConnectorGroup = (
  edgeId: string,
  connectorIds: string[],
  connectorEdgesMap: Record<string, ConnectorEdges>,
  edgesMap: Record<string, EdgeDataModel>,
  nodesMap: Record<string, NodeDataModel>,
  connectorType: 'label' | 'relationship'
) => {
  if (connectorIds.length === 1) {
    const connectorId = connectorIds[0];
    connectEntitiesAndConnectorNode(
      edgesMap,
      nodesMap,
      connectorEdgesMap[connectorId].source,
      connectorId,
      connectorEdgesMap[connectorId].target,
      connectorEdgesMap[connectorId].edgeType
    );
  } else {
    // Create group node for multiple connectors
    const groupNode: GroupNodeDataModel = {
      id: `grp(${edgeId})`,
      shape: 'group',
    };
    nodesMap[groupNode.id] = groupNode;

    let groupEdgesColor: EdgeColor = 'subdued';

    // Order of creation matters when using dagre layout, first create edges to the group node,
    // then connect the group node to the connector nodes
    connectEntitiesAndConnectorNode(
      edgesMap,
      nodesMap,
      connectorEdgesMap[connectorIds[0]].source,
      groupNode.id,
      connectorEdgesMap[connectorIds[0]].target,
      'solid',
      groupEdgesColor
    );

    connectorIds.forEach((connectorId) => {
      const node = nodesMap[connectorId];
      (node as Writable<LabelNodeDataModel | RelationshipNodeDataModel>).parentId = groupNode.id;

      connectEntitiesAndConnectorNode(
        edgesMap,
        nodesMap,
        groupNode.id,
        connectorId,
        groupNode.id,
        connectorEdgesMap[connectorId].edgeType
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

  // Process relationship nodes - each relationship node can have multiple sources
  Object.entries(relationshipEdges).forEach(([relationshipNodeId, edges]) => {
    // Create edges from all sources to the relationship node, and from the node to the target
    edges.sources.forEach((sourceId) => {
      connectEntitiesAndConnectorNode(
        edgesMap,
        nodesMap,
        sourceId,
        relationshipNodeId,
        edges.target,
        edges.edgeType
      );
    });
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
