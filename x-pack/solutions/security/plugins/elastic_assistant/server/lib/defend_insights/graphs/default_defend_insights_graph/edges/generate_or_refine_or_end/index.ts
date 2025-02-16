/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { GraphState } from '../../types';
import { getGenerateOrRefineOrEndDecision } from './helpers/get_generate_or_refine_or_end_decision';
import { getHasResults } from '../helpers/get_has_results';
import { getMaxHallucinationFailuresReached } from '../../helpers/get_max_hallucination_failures_reached';
import { getMaxRetriesReached } from '../../helpers/get_max_retries_reached';

export const getGenerateOrRefineOrEndEdge = (logger?: Logger) => {
  const edge = (state: GraphState): 'end' | 'generate' | 'refine' => {
    logger?.debug(() => '---GENERATE OR REFINE OR END---');
    const {
      anonymizedEvents,
      generationAttempts,
      hallucinationFailures,
      maxGenerationAttempts,
      maxHallucinationFailures,
      unrefinedResults,
    } = state;

    const hasZeroEvents = !anonymizedEvents.length;
    const hasUnrefinedResults = getHasResults(unrefinedResults);
    const maxRetriesReached = getMaxRetriesReached({ generationAttempts, maxGenerationAttempts });
    const maxHallucinationFailuresReached = getMaxHallucinationFailuresReached({
      hallucinationFailures,
      maxHallucinationFailures,
    });

    const decision = getGenerateOrRefineOrEndDecision({
      hasUnrefinedResults,
      hasZeroEvents,
      maxHallucinationFailuresReached,
      maxRetriesReached,
    });

    logger?.debug(
      () =>
        `generatOrRefineOrEndEdge evaluated the following (derived) state:\n${JSON.stringify(
          {
            anonymizedEvents: anonymizedEvents.length,
            generationAttempts,
            hallucinationFailures,
            hasUnrefinedResults,
            hasZeroEvents,
            maxHallucinationFailuresReached,
            maxRetriesReached,
            unrefinedResults: unrefinedResults?.length ?? 0,
          },
          null,
          2
        )}
        \n---GENERATE OR REFINE OR END: ${decision}---`
    );
    return decision;
  };

  return edge;
};
