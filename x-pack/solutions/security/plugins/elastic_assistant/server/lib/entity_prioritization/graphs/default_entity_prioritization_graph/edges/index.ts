/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { ThreatHuntingPrioritiesGraphState } from '../state';

// TODO: Implement edge logic similar to attack discovery
// These edges determine the flow between nodes based on state

export const getSelectCandidatesOrEndEdge = (logger?: Logger) => {
  return (state: ThreatHuntingPrioritiesGraphState): string => {
    // TODO: Determine if we should select candidates or end
    // For now, always select candidates if we have any
    if (state.candidateEntities.length > 0) {
      return 'select_candidates';
    }
    return 'end';
  };
};

export const getEnrichOrEndEdge = (logger?: Logger) => {
  return (state: ThreatHuntingPrioritiesGraphState): string => {
    // TODO: Determine if we should enrich or end
    // For now, always enrich if we have selected candidates
    if (state.selectedCandidateIds.length > 0) {
      return 'enrich';
    }
    return 'end';
  };
};

export const getFinalizeOrRefineOrEndEdge = (logger?: Logger) => {
  return (state: ThreatHuntingPrioritiesGraphState): string => {
    // TODO: Determine if we should finalize, refine, or end
    // Similar to attack discovery's generateOrRefineOrEndEdge
    // For now, always finalize
    return 'finalize';
  };
};

export const getRefineOrEndEdge = (logger?: Logger) => {
  return (state: ThreatHuntingPrioritiesGraphState): string => {
    // TODO: Determine if we should refine or end
    // Similar to attack discovery's refineOrEndEdge
    // For now, always end
    return 'end';
  };
};
