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
    actorIds,
    actorIdsCount,
    actorsDocData,
    actorEntityGroup,
    actorEntityType,
    actorLabel,
    actorHostIps,
    // target attributes
    targetIds,
    targetIdsCount,
    targetsDocData,
    targetEntityType,
    targetLabel,
    targetHostIps,
  } = record;

  const actorHostIpsArray = actorHostIps ? castArray(actorHostIps) : [];
  const targetHostIpsArray = targetHostIps ? castArray(targetHostIps) : [];

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

  const actorIdsArray = castArray(actorIds);
  const targetIdsArray = castArray(targetIds);

  const actorGroup = {
    id: actorIdsCount > 0 ? actorIdsArray[0] : `${actorEntityGroup} ${uuidv4()}`,
    type: actorEntityType,
    label: actorLabel,
    count: actorIdsCount,
    docData: actorsDocDataArray,
    hostIps: actorHostIpsArray,
  };

  const targetGroup =
    targetIdsCount > 0
      ? {
          id: targetIdsArray[0]!, // by definition, it can't be null
          type: targetEntityType,
          label: targetLabel,
          count: targetIdsCount,
          docData: targetsDocDataArray,
          hostIps: targetHostIpsArray,
        }
      : {
          // Unknown target
          id: `unknown ${uuidv4()}`,
          type: '',
          label: 'Unknown',
          count: 0,
          docData: [],
          hostIps: [],
        };

  [actorGroup, targetGroup].forEach(({ id, label, type, count, docData, hostIps }) => {
    if (nodesMap[id] === undefined) {
      nodesMap[id] = {
        id,
        color: 'primary' as const,
        label,
        documentsData: docData,
        ...deriveEntityAttributesFromType(type),
        ...(count > 1 ? { count } : {}),
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
