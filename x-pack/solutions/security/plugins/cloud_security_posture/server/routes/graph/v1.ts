/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  IScopedClusterClient,
  UiSettingsRequestHandlerContext,
} from '@kbn/core/server';
import type { GraphResponse } from '@kbn/cloud-security-posture-common/types/graph/v1';
import { SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING } from '@kbn/management-settings-ids';
import { fetchGraph } from './fetch_graph';
import type { EsQuery, OriginEventId } from './types';
import { parseRecords } from './parse_records';
import { fetchEntityData } from './fetch_entity_data';

export interface GraphContextServices {
  logger: Logger;
  esClient: IScopedClusterClient;
  uiSettings: UiSettingsRequestHandlerContext;
}

export interface GetGraphParams {
  services: GraphContextServices;
  query: {
    originEventIds: OriginEventId[];
    indexPatterns?: string[];
    spaceId?: string;
    start: string | number;
    end: string | number;
    esQuery?: EsQuery;
  };
  showUnknownTarget: boolean;
  nodesLimit?: number;
}

export const getGraph = async ({
  services: { esClient, logger, uiSettings },
  query: { originEventIds, spaceId = 'default', indexPatterns, start, end, esQuery },
  showUnknownTarget,
  nodesLimit,
}: GetGraphParams): Promise<Pick<GraphResponse, 'nodes' | 'edges' | 'messages'>> => {
  indexPatterns = indexPatterns ?? ['logs-*'];

  logger.trace(
    `Fetching graph for [originEventIds: ${originEventIds.join(
      ', '
    )}] in [spaceId: ${spaceId}] [indexPatterns: ${indexPatterns.join(',')}]`
  );

  const assetInventoryEnabled = await uiSettings.client.get(
    SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING
  );

  const results = await fetchGraph({
    esClient,
    showUnknownTarget,
    logger,
    start,
    end,
    originEventIds,
    indexPatterns,
    esQuery,
  });

  // Convert results into set of nodes and edges
  const graphData = parseRecords(logger, results.records, nodesLimit);

  // Enhance nodes with entity data
  const enhancedGraphData = await enhanceGraphWithEntityData({
    logger,
    graphData,
    esClient,
    assetInventoryEnabled,
  });

  // Return enhanced graph data
  return enhancedGraphData;
};

/**
 * Enhances graph nodes with entity data from asset inventory
 *
 * @param logger Logger instance for reporting issues
 * @param graphData Graph data from parseRecords function
 * @param esClient Elasticsearch client for fetching entity data
 * @param assetInventoryEnabled Whether asset inventory feature is enabled
 * @returns Enhanced graph data with entity information
 */
export const enhanceGraphWithEntityData = async ({
  logger,
  graphData,
  esClient,
  assetInventoryEnabled,
}: {
  logger: Logger;
  graphData: Pick<GraphResponse, 'nodes' | 'edges' | 'messages'>;
  esClient: IScopedClusterClient;
  assetInventoryEnabled: boolean;
}): Promise<Pick<GraphResponse, 'nodes' | 'edges' | 'messages'>> => {
  if (!assetInventoryEnabled) {
    return graphData;
  }

  // Collect all entity IDs from nodes to fetch entity data
  const entityIds = new Set<string>();
  graphData.nodes.forEach((node) => {
    // assuming node.id is the entity ID
    entityIds.add(node.id);
  });

  // Fetch entity data for all entity IDs
  let assetData: Record<string, any> = {};
  try {
    assetData = await fetchEntityData(esClient, logger, Array.from(entityIds));
  } catch (error) {
    logger.error(`Error fetching entity data: ${error}`);
    // Continue without entity data if fetch fails
  }

  // Enhance nodes with entity data
  const enhancedNodes = graphData.nodes.map((node, index) => ({
    ...node,
    assetData: entityIds.has(node.id) ? assetData[node.id] : undefined,
  }));

  // Return enhanced graph data
  return {
    ...graphData,
    nodes: enhancedNodes,
  };
};
