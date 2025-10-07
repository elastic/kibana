/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EnhancedIndexExplorerAnnotation, IndexResource } from '../../state';

export const selectBestIndices = ({ logger }: { logger: Logger }) => {
  return async (state: typeof EnhancedIndexExplorerAnnotation.State) => {
    const { analyzedResources, input } = state;
    if (!analyzedResources.length || !input) {
      return { selectedResources: [] };
    }

    // Simply select the first (highest relevance) resource as primary
    const sortedResources = analyzedResources.sort(
      (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );

    const primaryResource = sortedResources[0];
    const alternativeResources = sortedResources.slice(1, 3);

    const selectedResources: IndexResource[] = [primaryResource, ...alternativeResources];

    logger.debug(
      `Selected primary index: ${primaryResource.name} (score: ${primaryResource.relevanceScore})`
    );
    logger.debug(
      `Selected alternative indices: ${alternativeResources.map((r) => r.name).join(', ')}`
    );

    return {
      selectedResources,
      finalRecommendation: {
        primaryIndex: primaryResource.name,
        alternativeIndices: alternativeResources.map((r) => r.name),
        reasoning: `Selected based on relevance scores. Primary: ${primaryResource.name} (${
          primaryResource.relevanceScore
        }/10), Alternatives: ${alternativeResources
          .map((r) => `${r.name} (${r.relevanceScore}/10)`)
          .join(', ')}`,
      },
    };
  };
};
