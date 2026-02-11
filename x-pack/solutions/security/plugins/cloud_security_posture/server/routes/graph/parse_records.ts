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
  EdgeColor,
  EdgeDataModel,
  EntityNodeDataModel,
  GraphResponse,
  GroupNodeDataModel,
  LabelNodeDataModel,
  NodeDataModel,
  NodeDocumentDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/v1';
import type { Writable } from '@kbn/utility-types';
import {
  type GraphEdge,
  NON_ENRICHED_ENTITY_TYPE_PLURAL,
  NON_ENRICHED_ENTITY_TYPE_SINGULAR,
} from './types';
import { transformEntityTypeToIconAndShape } from './utils';

interface LabelEdges {
  source: string;
  target: string;
  edgeType: EdgeDataModel['type'];
}

interface ParseContext {
  readonly nodesLimit?: number;
  readonly nodesMap: Record<string, NodeDataModel>;
  readonly edgesMap: Record<string, EdgeDataModel>;
  /**
   * Maps label node ID to array of edges (source-target pairs).
   * A single label can connect to multiple actor-target pairs when
   * MV_EXPAND creates multiple rows from the same document(s).
   */
  readonly labelEdges: Record<string, LabelEdges[]>;
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
  nodesLimit?: number
): Pick<GraphResponse, 'nodes' | 'edges' | 'messages'> => {
  const ctx: ParseContext = {
    nodesLimit,
    logger,
    nodesMap: {},
    edgesMap: {},
    labelEdges: {},
    messages: [],
  };

  logger.trace(`Parsing records [length: ${records.length}] [nodesLimit: ${nodesLimit ?? 'none'}]`);

  createNodes(records, ctx);
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
    sourceId: string;
    targetId: string;
    labelNode: LabelNodeDataModel;
  }
) => {
  const { nodesMap, labelEdges } = context;
  const { sourceId, targetId, labelNode } = nodeData;

  // Only add the label node if it doesn't exist yet
  if (nodesMap[labelNode.id] === undefined) {
    nodesMap[labelNode.id] = labelNode;
    labelEdges[labelNode.id] = [];
  }

  // Add the edge (source-target pair) for this label node if not already present
  const existingEdges = labelEdges[labelNode.id];
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

const createNodes = (records: GraphEdge[], context: ParseContext) => {
  for (const record of records) {
    if (isAboveAPINodesLimit(context)) {
      emitAPINodesLimitMessage(context);
      break;
    }

    const { actorId, targetId } = createGroupedActorAndTargetNodes(record, context);

    const labelNode = createLabelNode(record);

    processLabelNodes(context, {
      sourceId: actorId,
      targetId,
      labelNode,
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

const processLabelGroup = (
  groupingKey: string,
  labelNodeIds: string[],
  labelEdges: Record<string, LabelEdges[]>,
  edgesMap: Record<string, EdgeDataModel>,
  nodesMap: Record<string, NodeDataModel>
) => {
  // When there's more than one label with same source-target pairs, create a group node
  if (labelNodeIds.length === 1) {
    const labelNodeId = labelNodeIds[0];
    const edges = labelEdges[labelNodeId];

    // Connect to all source-target pairs for this label
    edges.forEach((edge) => {
      connectEntitiesAndLabelNode(
        edgesMap,
        nodesMap,
        edge.source,
        labelNodeId,
        edge.target,
        edge.edgeType
      );
    });
  } else {
    const groupNode: GroupNodeDataModel = {
      id: `grp(${groupingKey})`,
      shape: 'group',
    };
    nodesMap[groupNode.id] = groupNode;
    let groupEdgesColor: EdgeColor = 'subdued';

    // Get all unique source-target pairs from all labels in this group
    const firstLabelEdges = labelEdges[labelNodeIds[0]];

    // Order of creation matters when using dagre layout, first create edges to the group node,
    // then connect the group node to the label nodes
    firstLabelEdges.forEach((edge) => {
      connectEntitiesAndLabelNode(
        edgesMap,
        nodesMap,
        edge.source,
        groupNode.id,
        edge.target,
        edge.edgeType,
        groupEdgesColor
      );
    });

    labelNodeIds.forEach((labelNodeId) => {
      (nodesMap[labelNodeId] as Writable<LabelNodeDataModel>).parentId = groupNode.id;
      const edges = labelEdges[labelNodeId];
      connectEntitiesAndLabelNode(
        edgesMap,
        nodesMap,
        groupNode.id,
        labelNodeId,
        groupNode.id,
        edges[0]?.edgeType ?? 'solid'
      );

      if ((nodesMap[labelNodeId] as LabelNodeDataModel).color === 'danger') {
        groupEdgesColor = 'danger';
      }
    });
  }
};

const createEdgesAndGroups = (context: ParseContext) => {
  const { edgesMap, nodesMap, labelEdges } = context;

  // Build grouping map: labels with same source-target pairs get stacked together
  const labelGrouping: Record<string, string[]> = {};

  Object.entries(labelEdges).forEach(([labelNodeId, edges]) => {
    const edgePairs = edges.map((e) => `${e.source}-${e.target}`).sort();
    const groupingKey = createHash('sha256').update(edgePairs.join(',')).digest('hex');

    if (labelGrouping[groupingKey] === undefined) {
      labelGrouping[groupingKey] = [];
    }
    labelGrouping[groupingKey].push(labelNodeId);
  });

  // Process each group
  Object.entries(labelGrouping).forEach(([groupingKey, labelNodeIds]) => {
    processLabelGroup(groupingKey, labelNodeIds, labelEdges, edgesMap, nodesMap);
  });
};

const connectEntitiesAndLabelNode = (
  edgesMap: Record<string, EdgeDataModel>,
  nodesMap: Record<string, NodeDataModel>,
  sourceNodeId: string,
  labelNodeId: string,
  targetNodeId: string,
  edgeType: EdgeDataModel['type'] = 'solid',
  colorOverride?: EdgeColor
) => {
  [
    connectNodes(nodesMap, sourceNodeId, labelNodeId, edgeType, colorOverride),
    connectNodes(nodesMap, labelNodeId, targetNodeId, edgeType, colorOverride),
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
