/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import { ApiMessageCode } from '@kbn/cloud-security-posture-common/types/graph/latest';
import type {
  Color,
  EdgeDataModel,
  EntityNodeDataModel,
  GraphRequest,
  GraphResponse,
  GroupNodeDataModel,
  LabelNodeDataModel,
  NodeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/v1';
import type { EsqlToRecords } from '@elastic/elasticsearch/lib/helpers';
import type { Writable } from '@kbn/utility-types';

type EsQuery = GraphRequest['query']['esQuery'];

interface GraphEdge {
  badge: number;
  ips?: string[] | string;
  hosts?: string[] | string;
  users?: string[] | string;
  actorIds: string[] | string;
  action: string;
  targetIds: string[] | string;
  eventOutcome: string;
  isOrigin: boolean;
  isOriginAlert: boolean;
}

interface LabelEdges {
  source: string;
  target: string;
  edgeType: EdgeDataModel['type'];
}

interface GraphContextServices {
  logger: Logger;
  esClient: IScopedClusterClient;
}

interface OriginEventId {
  id: string;
  isAlert: boolean;
}

interface GetGraphParams {
  services: GraphContextServices;
  query: {
    originEventIds: OriginEventId[];
    spaceId?: string;
    start: string | number;
    end: string | number;
    esQuery?: EsQuery;
  };
  showUnknownTarget: boolean;
  nodesLimit?: number;
}

export const getGraph = async ({
  services: { esClient, logger },
  query: { originEventIds, spaceId = 'default', start, end, esQuery },
  showUnknownTarget,
  nodesLimit,
}: GetGraphParams): Promise<Pick<GraphResponse, 'nodes' | 'edges' | 'messages'>> => {
  logger.trace(
    `Fetching graph for [originEventIds: ${originEventIds.join(', ')}] in [spaceId: ${spaceId}]`
  );

  const results = await fetchGraph({
    esClient,
    showUnknownTarget,
    logger,
    start,
    end,
    originEventIds,
    esQuery,
  });

  // Convert results into set of nodes and edges
  return parseRecords(logger, results.records, nodesLimit);
};

interface ParseContext {
  readonly nodesLimit?: number;
  readonly nodesMap: Record<string, NodeDataModel>;
  readonly edgesMap: Record<string, EdgeDataModel>;
  readonly edgeLabelsNodes: Record<string, string[]>;
  readonly labelEdges: Record<string, LabelEdges>;
  readonly messages: ApiMessageCode[];
  readonly logger: Logger;
}

const parseRecords = (
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

const fetchGraph = async ({
  esClient,
  logger,
  start,
  end,
  originEventIds,
  showUnknownTarget,
  esQuery,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  start: string | number;
  end: string | number;
  originEventIds: OriginEventId[];
  showUnknownTarget: boolean;
  esQuery?: EsQuery;
}): Promise<EsqlToRecords<GraphEdge>> => {
  const originAlertIds = originEventIds.filter((originEventId) => originEventId.isAlert);
  const query = `from logs-*
| WHERE event.action IS NOT NULL AND actor.entity.id IS NOT NULL
| EVAL isOrigin = ${
    originEventIds.length > 0
      ? `event.id in (${originEventIds.map((_id, idx) => `?og_id${idx}`).join(', ')})`
      : 'false'
  }
| EVAL isOriginAlert = isOrigin AND ${
    originAlertIds.length > 0
      ? `event.id in (${originAlertIds.map((_id, idx) => `?og_alrt_id${idx}`).join(', ')})`
      : 'false'
  }
| STATS badge = COUNT(*),
  ips = VALUES(related.ip),
  // hosts = VALUES(related.hosts),
  users = VALUES(related.user)
    by actorIds = actor.entity.id,
      action = event.action,
      targetIds = target.entity.id,
      eventOutcome = event.outcome,
      isOrigin,
      isOriginAlert
| LIMIT 1000
| SORT isOrigin DESC`;

  logger.trace(`Executing query [${query}]`);

  const eventIds = originEventIds.map((originEventId) => originEventId.id);
  return await esClient.asCurrentUser.helpers
    .esql({
      columnar: false,
      filter: buildDslFilter(eventIds, showUnknownTarget, start, end, esQuery),
      query,
      // @ts-ignore - types are not up to date
      params: [
        ...originEventIds.map((originEventId, idx) => ({ [`og_id${idx}`]: originEventId.id })),
        ...originEventIds
          .filter((originEventId) => originEventId.isAlert)
          .map((originEventId, idx) => ({ [`og_alrt_id${idx}`]: originEventId.id })),
      ],
    })
    .toRecords<GraphEdge>();
};

const buildDslFilter = (
  eventIds: string[],
  showUnknownTarget: boolean,
  start: string | number,
  end: string | number,
  esQuery?: EsQuery
) => ({
  bool: {
    filter: [
      {
        range: {
          '@timestamp': {
            gte: start,
            lte: end,
          },
        },
      },
      ...(showUnknownTarget
        ? []
        : [
            {
              exists: {
                field: 'target.entity.id',
              },
            },
          ]),
      {
        bool: {
          should: [
            ...(esQuery?.bool.filter?.length ||
            esQuery?.bool.must?.length ||
            esQuery?.bool.should?.length ||
            esQuery?.bool.must_not?.length
              ? [esQuery]
              : []),
            {
              terms: {
                'event.id': eventIds,
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
});

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
      ips,
      hosts,
      users,
      actorIds,
      action,
      targetIds,
      isOrigin,
      isOriginAlert,
      eventOutcome,
    } = record;
    const actorIdsArray = castArray(actorIds);
    const targetIdsArray = castArray(targetIds);
    const unknownTargets: string[] = [];

    // Ensure all targets has an id (target can return null from the query)
    targetIdsArray.forEach((id, idx) => {
      if (!id) {
        targetIdsArray[idx] = `unknown ${uuidv4()}`;
        unknownTargets.push(targetIdsArray[idx]);
      }
    });

    // Create entity nodes
    [...actorIdsArray, ...targetIdsArray].forEach((id) => {
      if (nodesMap[id] === undefined) {
        nodesMap[id] = {
          id,
          label: unknownTargets.includes(id) ? 'Unknown' : undefined,
          color: isOriginAlert ? 'danger' : 'primary',
          ...determineEntityNodeShape(
            id,
            castArray(ips ?? []),
            castArray(hosts ?? []),
            castArray(users ?? [])
          ),
        };
      }
    });

    // Create label nodes
    for (const actorId of actorIdsArray) {
      for (const targetId of targetIdsArray) {
        const edgeId = `a(${actorId})-b(${targetId})`;

        if (edgeLabelsNodes[edgeId] === undefined) {
          edgeLabelsNodes[edgeId] = [];
        }

        const labelNode: LabelNodeDataModel = {
          id: edgeId + `label(${action})outcome(${eventOutcome})`,
          label: action,
          color: isOriginAlert ? 'danger' : eventOutcome === 'failed' ? 'warning' : 'primary',
          shape: 'label',
        };

        nodesMap[labelNode.id] = labelNode;
        edgeLabelsNodes[edgeId].push(labelNode.id);
        labelEdges[labelNode.id] = {
          source: actorId,
          target: targetId,
          edgeType: isOrigin ? 'solid' : 'dashed',
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
} => {
  // If actor is a user return ellipse
  if (users.includes(actorId)) {
    return { shape: 'ellipse', icon: 'user' };
  }

  // If actor is a host return hexagon
  if (hosts.includes(actorId)) {
    return { shape: 'hexagon', icon: 'storage' };
  }

  // If actor is an IP return diamond
  if (ips.includes(actorId)) {
    return { shape: 'diamond', icon: 'globe' };
  }

  return { shape: 'hexagon' };
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
      let groupEdgesColor: Color = 'primary';
      let groupEdgesType: EdgeDataModel['type'] = 'dashed';

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
        } else if (
          (nodesMap[edgeLabelId] as LabelNodeDataModel).color === 'warning' &&
          groupEdgesColor !== 'danger'
        ) {
          // Use warning only if there's no danger color
          groupEdgesColor = 'warning';
        }

        if (labelEdges[edgeLabelId].edgeType === 'solid') {
          groupEdgesType = 'solid';
        }
      });

      connectEntitiesAndLabelNode(
        edgesMap,
        nodesMap,
        labelEdges[edgeLabelsIds[0]].source,
        groupNode.id,
        labelEdges[edgeLabelsIds[0]].target,
        groupEdgesType,
        groupEdgesColor
      );
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
  colorOverride?: Color
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
  colorOverride?: Color
): EdgeDataModel => {
  const sourceNode = nodesMap[sourceNodeId];
  const targetNode = nodesMap[targetNodeId];
  const color =
    sourceNode.shape !== 'group' && targetNode.shape !== 'label'
      ? sourceNode.color
      : targetNode.shape !== 'group'
      ? targetNode.color
      : 'primary';

  return {
    id: `a(${sourceNodeId})-b(${targetNodeId})`,
    source: sourceNodeId,
    target: targetNodeId,
    color: colorOverride ?? color,
    type: edgeType,
  };
};
