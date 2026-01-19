/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { BaseGraphState, GraphInsightTypes } from '../../../graphs';
import { getGenerateOrRefineOrEndDecision } from './helpers/get_generate_or_refine_or_end_decision';
import { getMaxHallucinationFailuresReached } from '../../helpers/get_max_hallucination_failures_reached';
import { getMaxRetriesReached } from '../../helpers/get_max_retries_reached';

export const getGenerateOrRefineOrEndEdge = <T extends GraphInsightTypes>(logger?: Logger) => {
  const edge = (state: BaseGraphState<T>): 'end' | 'generate' | 'refine' => {
    logger?.debug(() => '---GENERATE OR REFINE OR END---');
    const {
      anonymizedDocuments,
      generationAttempts,
      hallucinationFailures,
      maxGenerationAttempts,
      maxHallucinationFailures,
      unrefinedResults,
    } = state;

    const hasZeroDocs = !anonymizedDocuments.length;
    const hasUnrefinedResults = unrefinedResults !== null;
    const maxRetriesReached = getMaxRetriesReached({ generationAttempts, maxGenerationAttempts });
    const maxHallucinationFailuresReached = getMaxHallucinationFailuresReached({
      hallucinationFailures,
      maxHallucinationFailures,
    });

    const decision = getGenerateOrRefineOrEndDecision({
      hasUnrefinedResults,
      hasZeroDocs,
      maxHallucinationFailuresReached,
      maxRetriesReached,
    });

    logger?.debug(
      () =>
        `generatOrRefineOrEndEdge evaluated the following (derived) state:\n${JSON.stringify(
          {
            anonymizedDocuments: anonymizedDocuments.length,
            generationAttempts,
            hallucinationFailures,
            hasUnrefinedResults,
            hasZeroDocs,
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
