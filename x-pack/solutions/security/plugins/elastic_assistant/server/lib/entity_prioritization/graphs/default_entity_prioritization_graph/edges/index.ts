/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { ThreatHuntingPrioritiesGraphState } from '../state';

// These edges determine the flow between nodes based on state

export const getEnrichOrEndEdge = (logger?: Logger) => {
  return (state: ThreatHuntingPrioritiesGraphState): string => {
    logger?.debug(() => '---ENRICH OR END---');
    // After FIND_AND_SELECT_CANDIDATES, we should enrich if we have selected candidates
    if (state.selectedCandidateIds.length > 0) {
      logger?.debug(
        () => `Going to enrich: ${state.selectedCandidateIds.length} candidates selected`
      );
      return 'enrich';
    }
    logger?.debug(() => 'Ending: no candidates selected');
    return 'end';
  };
};
