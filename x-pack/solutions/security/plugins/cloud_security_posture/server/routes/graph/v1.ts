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
import { enhanceGraphWithEntityData } from './enhance_graph_with_entity_data';

// Re-export types and functions for backward compatibility
export {
  type MappedNodeProps,
  type NodeFieldsMapping,
  mapEntityDataToNodeProps,
  transformEntityTypeToIcon,
} from './enhance_graph_with_entity_data';

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

  if (assetInventoryEnabled) {
    // Enhance nodes with entity data
    const enhancedGraphData = await enhanceGraphWithEntityData({
      logger,
      graphData,
      esClient,
      spaceId,
    });

    // Return enhanced graph data
    return enhancedGraphData;
  }
  // Return graph data
  return graphData;
};
