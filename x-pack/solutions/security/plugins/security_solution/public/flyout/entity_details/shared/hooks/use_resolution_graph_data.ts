/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../../../../entity_analytics/api/api';
import { transformResolutionToGraph } from '../utils/resolution_graph_transformer';

/**
 * Hook to fetch and transform entity resolution data for graph visualization.
 * Returns graph nodes and edges representing the entity's resolution group.
 */
export const useResolutionGraphData = (entityType: string, entityId: string | undefined) => {
  const { fetchResolution } = useEntityAnalyticsRoutes();

  return useQuery({
    queryKey: ['resolution-graph', entityType, entityId],
    queryFn: async () => {
      if (!entityId) {
        return null;
      }

      const resolution = await fetchResolution({ entityType, entityId });

      // If entity is not part of a resolution group, return null
      if (!resolution.resolution_id || !resolution.group_members?.length) {
        return null;
      }

      return transformResolutionToGraph(resolution, entityType);
    },
    enabled: !!entityId,
    staleTime: 30000, // Cache for 30 seconds
    retry: false, // Don't retry on failure - entity might not have resolution data
  });
};
