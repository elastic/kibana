/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { ThreatHuntingPrioritiesGraphState } from '../state';
import { DEFAULT_MAX_REFINEMENT_ATTEMPTS } from '../constants';

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
    logger?.debug(() => '---FINALIZE OR REFINE OR END---');

    const {
      priorities,
      unrefinedResults,
      generationAttempts,
      hallucinationFailures,
      maxGenerationAttempts,
      maxHallucinationFailures,
    } = state;

    const hasPriorities = priorities !== null;
    const hasUnrefinedResults = unrefinedResults !== null && unrefinedResults.length > 0;
    const maxRetriesReached = generationAttempts >= maxGenerationAttempts;
    const maxHallucinationFailuresReached = hallucinationFailures >= maxHallucinationFailures;

    // If we've exceeded limits, end
    if (maxRetriesReached || maxHallucinationFailuresReached) {
      logger?.debug(
        () =>
          `Ending due to limits: maxRetriesReached=${maxRetriesReached}, maxHallucinationFailuresReached=${maxHallucinationFailuresReached}`
      );
      return 'end';
    }

    // After FINALIZE runs, priorities should always be set (even if empty array)
    // If we have priorities and unrefined results, go to refine
    if (hasPriorities && hasUnrefinedResults) {
      logger?.debug(() => 'Going to refine: has priorities and unrefined results');
      return 'refine';
    }

    // If we have priorities (even if empty), we're done
    // Never return 'finalize' to prevent infinite loop
    if (hasPriorities) {
      logger?.debug(() => 'Ending: has priorities (no unrefined results to refine)');
      return 'end';
    }

    // This should never happen after FINALIZE runs, but if it does, end to prevent infinite loop
    logger?.warn(() => 'Ending: no priorities found after finalize, preventing infinite loop');
    return 'end';
  };
};

export const getRefineOrEndEdge = (logger?: Logger) => {
  return (state: ThreatHuntingPrioritiesGraphState): string => {
    logger?.debug(() => '---REFINE OR END---');

    const {
      priorities,
      refinements,
      generationAttempts,
      hallucinationFailures,
      maxGenerationAttempts,
      maxHallucinationFailures,
    } = state;

    const hasFinalResults = priorities !== null && priorities.length > 0;
    const maxRetriesReached = generationAttempts >= maxGenerationAttempts;
    const maxHallucinationFailuresReached = hallucinationFailures >= maxHallucinationFailures;
    const refinementAttempts = refinements.length;
    const maxRefinementAttemptsReached = refinementAttempts >= DEFAULT_MAX_REFINEMENT_ATTEMPTS;

    // End if we have final results, exceeded limits, or reached max refinement attempts
    if (
      hasFinalResults ||
      maxRetriesReached ||
      maxHallucinationFailuresReached ||
      maxRefinementAttemptsReached
    ) {
      logger?.debug(
        () =>
          `Ending: hasFinalResults=${hasFinalResults}, maxRetriesReached=${maxRetriesReached}, maxHallucinationFailuresReached=${maxHallucinationFailuresReached}, maxRefinementAttemptsReached=${maxRefinementAttemptsReached} (attempts: ${refinementAttempts}/${DEFAULT_MAX_REFINEMENT_ATTEMPTS})`
      );
      return 'end';
    }

    // Otherwise, continue refining (but only if we haven't exceeded the limit)
    logger?.debug(
      () =>
        `Continuing to refine: attempt ${refinementAttempts + 1}/${DEFAULT_MAX_REFINEMENT_ATTEMPTS}`
    );
    return 'refine';
  };
};
