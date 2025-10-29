/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EnhancedIndexExplorerAnnotation, IndexResource } from '../../state';

export const validateIndexAccess = ({ esClient }: { esClient: ElasticsearchClient }) => {
  return async (state: typeof EnhancedIndexExplorerAnnotation.State) => {
    const { selectedResources } = state;
    if (!selectedResources.length) {
      return { selectedResources: [] };
    }

    // Validate access to each selected resource
    const accessibleResources: IndexResource[] = [];

    for (const resource of selectedResources) {
      try {
        // Try to get basic info about the index to validate access
        await esClient.indices.get({
          index: resource.name,
          ignore_unavailable: true,
        });

        accessibleResources.push({
          ...resource,
          isAccessible: true,
        });
      } catch (error) {
        // Ignore inaccessible indices
      }
    }

    let finalRecommendation = state.finalRecommendation;
    if (finalRecommendation && accessibleResources.length > 0) {
      // Update the recommendation to only include accessible indices
      const accessibleNames = accessibleResources.map((r) => r.name);
      finalRecommendation = {
        ...finalRecommendation,
        primaryIndex: accessibleNames[0] || finalRecommendation.primaryIndex,
        alternativeIndices: accessibleNames.slice(1),
      };
    }

    return {
      selectedResources: accessibleResources,
      finalRecommendation,
    };
  };
};
