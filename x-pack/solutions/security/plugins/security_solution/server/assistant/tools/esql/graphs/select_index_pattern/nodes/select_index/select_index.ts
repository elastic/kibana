/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';

import type { SelectIndexPatternAnnotation } from '../../state';

export const getSelectIndexPattern = () => {
  return async (state: typeof SelectIndexPatternAnnotation.State) => {
    const indexPatternAnalysis = Object.values(state.indexPatternAnalysis);
    const candidateIndexPatterns = indexPatternAnalysis.filter(
      ({ containsRequiredData }) => containsRequiredData
    );

    if (candidateIndexPatterns.length === 0) {
      // Non of the analyzed index patterns contained the required data
      return new Command({
        update: {
          selectedIndexPattern: null,
        },
      });
    }

    if (candidateIndexPatterns.length === 1) {
      // Exactly one index pattern contains the required data
      // We can skip the LLM and return the index pattern directly
      return new Command({
        update: {
          selectedIndexPattern: candidateIndexPatterns[0].indexPattern,
        },
      });
    }

    // More than one index pattern contains the required data, we will pick the shortest one (this is likely to be the least specific)
    return new Command({
      update: {
        selectedIndexPattern: candidateIndexPatterns.sort(
          (a, b) => a.indexPattern.length - b.indexPattern.length
        )[0].indexPattern,
      },
    });
  };
};
