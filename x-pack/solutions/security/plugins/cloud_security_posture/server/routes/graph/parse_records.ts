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
} from '@kbn/cloud-security-posture-common/types/graph/v1';
import type { Writable } from '@kbn/utility-types';
import type { GraphEdge } from './types';

interface LabelEdges {
  source: string;
  target: string;
  edgeType: EdgeDataModel['type'];
}

interface ParseContext {
  readonly nodesLimit?: number;
  readonly nodesMap: Record<string, NodeDataModel>;
  readonly edgesMap: Record<string, EdgeDataModel>;
  readonly edgeLabelsNodes: Record<string, string[]>;
  readonly labelEdges: Record<string, LabelEdges>;
  readonly messages: ApiMessageCode[];
  readonly logger: Logger;
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
    edgeLabelsNodes: {},
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

const createNodes = (records: GraphEdge[], context: Omit<ParseContext, 'edgesMap'>) => {
  const { nodesMap, edgeLabelsNodes, labelEdges } = context;

  for (const record of records) {
    if (context.nodesLimit !== undefined && Object.keys(nodesMap).length >= context.nodesLimit) {
      context.logger.debug(
        `Reached nodes limit [limit: ${context.nodesLimit}] [current: ${
          Object.keys(nodesMap).length
        }]`
      );
      context.messages.push(ApiMessageCode.ReachedNodesLimit);
      break;
    }

    const { docs, ips, hosts, users, actorIds, action, targetIds, isOriginAlert } = record;
    const actorIdsArray = castArray(actorIds);
    const targetIdsArray = castArray(targetIds);
    const targetIdsArraySafe: string[] = [];
    const unknownTargets: string[] = [];

    // Ensure all targets has an id (target can return null from the query)
    targetIdsArray.forEach((id, idx) => {
      if (!id) {
        const generatedTargetId = `unknown ${uuidv4()}`;
        targetIdsArraySafe.push(generatedTargetId);
        unknownTargets.push(generatedTargetId);
      } else {
        targetIdsArraySafe.push(id);
      }
    });

    // Create entity nodes
    [...actorIdsArray, ...targetIdsArraySafe].forEach((id) => {
      if (nodesMap[id] === undefined) {
        const shapeInfo = determineEntityNodeShape(
          id,
          castArray(ips ?? []),
          castArray(hosts ?? []),
          castArray(users ?? [])
        );

        // Generate sample flag badges (in a real implementation, this would come from the data)
        const flagBadges = generateFlagBadges(id, shapeInfo.entityType);

        nodesMap[id] = {
          id,
          label: unknownTargets.includes(id) ? 'Unknown' : undefined,
          color: 'primary',
          ...shapeInfo,
          flagBadges,
        };
      }
    });

    // Create label nodes
    for (const actorId of actorIdsArray) {
      for (const targetId of targetIdsArraySafe) {
        const edgeId = `a(${actorId})-b(${targetId})`;

        if (edgeLabelsNodes[edgeId] === undefined) {
          edgeLabelsNodes[edgeId] = [];
        }

        const labelNode: LabelNodeDataModel = {
          id: edgeId + `label(${action})`,
          label: action,
          color: isOriginAlert ? 'danger' : 'primary',
          shape: 'label',
          documentsData: parseDocumentsData(docs),
        };

        nodesMap[labelNode.id] = labelNode;
        edgeLabelsNodes[edgeId].push(labelNode.id);
        labelEdges[labelNode.id] = {
          source: actorId,
          target: targetId,
          edgeType: 'solid',
        };
      }
    }
  }
};

const determineEntityNodeShape = (
  actorId: string,
  ips: string[],
  hosts: string[],
  users: string[]
): {
  shape: EntityNodeDataModel['shape'];
  icon?: string;
  entityType?: 'user' | 'host' | 'other';
  entityCount?: number;
  secondaryLabel?: string;
} => {
  // Generate sample entity count for demonstration (in real implementation, this would come from actual grouping logic)
  const entityCount = Math.random() < 0.3 ? Math.floor(Math.random() * 8) + 2 : undefined;

  // If actor is a user return ellipse
  if (users.includes(actorId)) {
    return { 
      shape: 'ellipse', 
      icon: 'user',
      entityType: 'user',
      entityCount,
      secondaryLabel: 'Detail information +99'
    };
  }

  // If actor is a host return hexagon
  if (hosts.includes(actorId)) {
    // Generate sample IP addresses for hosts
    const sampleIps = generateSampleIps(actorId);
    return { 
      shape: 'hexagon', 
      icon: 'storage',
      entityType: 'host',
      entityCount,
      secondaryLabel: sampleIps
    };
  }

  // If actor is an IP return diamond
  if (ips.includes(actorId)) {
    return { 
      shape: 'diamond', 
      icon: 'globe',
      entityType: 'other',
      entityCount,
      secondaryLabel: 'Detail information +99'
    };
  }

  // Default logic for other types - use different shapes based on patterns in the ID
  if (actorId.includes('database') || actorId.includes('service') || actorId.includes('application')) {
    return { 
      shape: 'rectangle',
      icon: 'database',
      entityType: 'other',
      entityCount,
      secondaryLabel: 'Detail information +99'
    };
  }

  // Default to hexagon for unknown types
  return { 
    shape: 'hexagon',
    entityType: 'other',
    entityCount,
    secondaryLabel: 'Detail information +99'
  };
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

const createEdgesAndGroups = (context: ParseContext) => {
  const { edgeLabelsNodes, edgesMap, nodesMap, labelEdges } = context;

  Object.entries(edgeLabelsNodes).forEach(([edgeId, edgeLabelsIds]) => {
    // When there's more than one edge label, create a group node
    if (edgeLabelsIds.length === 1) {
      const edgeLabelId = edgeLabelsIds[0];

      connectEntitiesAndLabelNode(
        edgesMap,
        nodesMap,
        labelEdges[edgeLabelId].source,
        edgeLabelId,
        labelEdges[edgeLabelId].target,
        labelEdges[edgeLabelId].edgeType
      );
    } else {
      const groupNode: GroupNodeDataModel = {
        id: `grp(${edgeId})`,
        shape: 'group',
      };
      nodesMap[groupNode.id] = groupNode;
      let groupEdgesColor: EdgeColor = 'subdued';

      // Order of creation matters when using dagre layout, first create edges to the group node,
      // then connect the group node to the label nodes
      connectEntitiesAndLabelNode(
        edgesMap,
        nodesMap,
        labelEdges[edgeLabelsIds[0]].source,
        groupNode.id,
        labelEdges[edgeLabelsIds[0]].target,
        'solid',
        groupEdgesColor
      );

      edgeLabelsIds.forEach((edgeLabelId) => {
        (nodesMap[edgeLabelId] as Writable<LabelNodeDataModel>).parentId = groupNode.id;
        connectEntitiesAndLabelNode(
          edgesMap,
          nodesMap,
          groupNode.id,
          edgeLabelId,
          groupNode.id,
          labelEdges[edgeLabelId].edgeType
        );

        if ((nodesMap[edgeLabelId] as LabelNodeDataModel).color === 'danger') {
          groupEdgesColor = 'danger';
        }
      });
    }
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

const generateSampleIps = (hostId: string): string => {
  // Generate sample IP addresses for hosts based on hash to make it consistent
  let hash = 0;
  for (let i = 0; i < hostId.length; i++) {
    const char = hostId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Generate IP addresses
  const ipBase = Math.abs(hash % 255);
  const ipSecond = Math.abs((hash >> 8) % 255);
  const ipThird = Math.abs((hash >> 16) % 255);
  const numIps = Math.abs(hash % 3) + 1; // 1-3 IPs
  
  if (numIps === 1) {
    return `IP: 10.${ipBase}.${ipSecond}.${ipThird}`;
  }
  
  const firstIp = `10.${ipBase}.${ipSecond}.${ipThird}`;
  const additionalCount = Math.abs(hash % 99) + numIps - 1;
  
  return `IP: ${firstIp} +${additionalCount}`;
};

const generateFlagBadges = (id: string, entityType?: string): Array<{ flag: string; count: number }> => {
  // In a real implementation, this would analyze the actual data to determine
  // the geographical distribution of related events/alerts
  // For demonstration purposes, we'll generate consistent sample data based on the ID hash
  
  const sampleFlags = ['🇺🇸', '🇬🇧', '🇩🇪', '🇫🇷', '🇯🇵', '🇨🇦', '🇦🇺', '🇪🇺'];
  const flagBadges = [];
  
  // Use a simple hash of the ID to make the flags consistent
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Generate 1-4 flag badges per node based on hash (frontend will limit display to 2)
  const numFlags = Math.abs(hash % 4) + 1;
  
  for (let i = 0; i < numFlags; i++) {
    const flagIndex = Math.abs(hash + i) % sampleFlags.length;
    const flag = sampleFlags[flagIndex];
    const count = Math.abs(hash + i * 7) % 99 + 1;
    
    // Avoid duplicate flags
    if (!flagBadges.some(badge => badge.flag === flag)) {
      flagBadges.push({ flag, count });
    }
  }
  
  return flagBadges;
};

const parseDocumentsData = (docs: string[] | string): NodeDocumentDataModel[] => {
  if (typeof docs === 'string') {
    return [JSON.parse(docs)];
  }

  return docs.map((doc) => JSON.parse(doc));
};
