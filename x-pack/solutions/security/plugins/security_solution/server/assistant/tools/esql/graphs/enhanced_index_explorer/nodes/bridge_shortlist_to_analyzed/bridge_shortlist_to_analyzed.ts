/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';
import type { EnhancedIndexExplorerAnnotation } from '../../state';

export const bridgeShortlistToAnalyzed = () => {
  return async (state: typeof EnhancedIndexExplorerAnnotation.State) => {
    const { shortlistedIndexPatterns, discoveredResources } = state;

    // If no shortlisted patterns, return empty array
    if (shortlistedIndexPatterns.length === 0) {
      return new Command({
        update: {
          analyzedResources: [],
        },
      });
    }

    // Filter discovered resources to only include shortlisted ones
    const analyzedResources = discoveredResources.filter((resource) =>
      shortlistedIndexPatterns.includes(resource.name)
    );

    return new Command({
      update: {
        analyzedResources,
      },
    });
  };
};
