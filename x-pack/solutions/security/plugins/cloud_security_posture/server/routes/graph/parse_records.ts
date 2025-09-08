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
  readonly edgeLabelsNodes: Record<string, string[]>;
  readonly labelEdges: Record<string, LabelEdges>;
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

    const {
      docs,
      actorIds,
      action,
      targetIds,
      isOrigin,
      isOriginAlert,
      actorsDocData,
      targetsDocData,
      isAlert,
    } = record;

    const actorIdsArray = castArray(actorIds);
    const targetIdsArray = castArray(targetIds);

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
        nodesMap[id] = {
          id,
          label: unknownTargets.includes(id) ? 'Unknown' : undefined,
          color: 'primary',
          ...determineEntityNodeVisualProps(id, [...actorsDocDataArray, ...targetsDocDataArray]),
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
          id: edgeId + `label(${action})oe(${isOrigin ? 1 : 0})oa(${isOriginAlert ? 1 : 0})`,
          label: action,
          color: isOriginAlert || isAlert ? 'danger' : 'primary',
          isOrigin,
          isOriginAlert,
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

const determineEntityNodeVisualProps = (
  actorId: string,
  entitiesData: NodeDocumentDataModel[] = []
): NodeVisualProps => {
  // try to find an exact match by entity id
  const matchingEntity = entitiesData.find((entity) => entity.id === actorId);

  // Extract entity data from the matching entity's documentsData if available
  const entityDetailsData = matchingEntity?.entity ?? {};

  let mappedProps: Partial<NodeVisualProps> = {
    shape: 'rectangle',
  };

  if (entityDetailsData.name) {
    mappedProps.label = entityDetailsData.name;
  }

  if (entityDetailsData.type) {
    mappedProps.tag = entityDetailsData.type;

    const { icon, shape } = transformEntityTypeToIconAndShape(entityDetailsData);

    mappedProps = {
      ...mappedProps,
      ...(icon && { icon }),
      ...(shape && { shape }),
    };
  }

  return mappedProps as NodeVisualProps;
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

const parseDocumentsData = (docs: string[] | string): NodeDocumentDataModel[] => {
  if (typeof docs === 'string') {
    return [JSON.parse(docs)];
  }

  return docs.map((doc) => JSON.parse(doc));
};
