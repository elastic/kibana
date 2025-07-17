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
import type { MappedAssetProps } from '@kbn/cloud-security-posture-common/types/assets';
import { entityTypeMappings } from './entity_type_constants';
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

/**
 * Interface for the input parameters to mapEntityDataToNodeProps
 */
interface EntityDataToNodePropsParams {
  entityData: MappedAssetProps;
  nodeFieldsMapping: NodeFieldsMapping; // Maps asset fields to node fields
}

/**
 * Type that defines mapping from MappedAssetProps fields to MappedNodeProps fields
 * with optional transform functions
 */
export type NodeFieldsMapping = {
  [K in keyof MappedAssetProps]?:
    | keyof MappedNodeProps // Simple field mapping
    | {
        targetField: keyof MappedNodeProps;
        transform?: (value: MappedAssetProps[K]) => any;
      }; // Advanced mapping with transform
};

/**
 * Interface for the output properties from mapEntityDataToNodeProps
 */
export interface MappedNodeProps {
  label?: string;
  icon?: string;
  // Additional properties can be added here in the future
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
    spaceId,
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
  spaceId,
}: {
  logger: Logger;
  graphData: Pick<GraphResponse, 'nodes' | 'edges' | 'messages'>;
  esClient: IScopedClusterClient;
  assetInventoryEnabled: boolean;
  spaceId: string;
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
  let assetData: Record<string, MappedAssetProps> = {};
  try {
    assetData = await fetchEntityData(esClient, logger, Array.from(entityIds), spaceId);
  } catch (error) {
    logger.error(`Error fetching entity data: ${error}`);
    // Continue without entity data if fetch fails
  }

  // Map entity data to node properties and return enhanced graph data
  const enhancedNodes = graphData.nodes.map((node) => {
    // If entity has asset data
    if (entityIds.has(node.id) && assetData[node.id]) {
      const entityData = assetData[node.id];
      const mappedProps = mapEntityDataToNodeProps({
        entityData,
        nodeFieldsMapping: {
          entityName: 'label',
          entityType: {
            targetField: 'icon',
            transform: transformEntityTypeToIcon,
          },
        },
      });

      // Apply mapped properties to the node
      return {
        ...node,
        ...mappedProps,
      };
    }
    return node;
  });

  // Return enhanced graph data
  return {
    ...graphData,
    nodes: enhancedNodes,
  };
};

/**
 * Maps entity data to node properties for visualization.
 * This function extracts relevant information from entity data and maps it to
 * properties used by the graph visualization components.
 *
 * @param params Object containing entity data and mapping configuration
 * @returns Mapped node properties
 */
export const mapEntityDataToNodeProps = (params: EntityDataToNodePropsParams): MappedNodeProps => {
  const { entityData, nodeFieldsMapping } = params;

  const mappedProps: MappedNodeProps = {};

  // Apply field mappings from entityData to mappedProps
  Object.entries(nodeFieldsMapping).forEach(([assetField, fieldConfig]) => {
    const assetKey = assetField as keyof MappedAssetProps;
    const assetValue = entityData[assetKey];

    if (assetValue === undefined) {
      return; // Skip if asset value is undefined
    }

    // Handle both simple mapping (string) and complex mapping (object with transform)
    if (typeof fieldConfig === 'string') {
      // Simple mapping: just copy the value to the target field
      mappedProps[fieldConfig as keyof MappedNodeProps] = assetValue;
    } else if (fieldConfig && typeof fieldConfig === 'object') {
      // Complex mapping with possible transform
      const { targetField, transform } = fieldConfig;

      // Apply transform if provided, otherwise use the value directly
      const transformedValue = transform ? transform(assetValue) : assetValue;

      mappedProps[targetField] = transformedValue;
    }
  });

  return mappedProps;
};

/**
 * Transforms entity type values to standardized icon names
 * This helps normalize different entity type representations to consistent icon names
 *
 * @param entityType The entity type value to transform
 * @returns The standardized icon name
 */
export const transformEntityTypeToIcon = (entityType: string | undefined): string | undefined => {
  if (!entityType) {
    return undefined;
  }

  // Convert to lowercase for case-insensitive comparison
  const entityTypeLower = entityType.toLowerCase();

  // Find the first matching mapping where the entity type is in the values array
  const mappingResult = entityTypeMappings.find((mapping) =>
    mapping.values.some((type: string) => entityTypeLower === type.toLowerCase())
  );

  // Return the icon name if found, otherwise default to 'question'
  return mappingResult?.icon ?? undefined;
};
