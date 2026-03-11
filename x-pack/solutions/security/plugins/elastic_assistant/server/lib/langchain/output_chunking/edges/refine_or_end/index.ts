/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { BaseGraphState, GraphInsightTypes } from '../../../graphs';
import { getMaxHallucinationFailuresReached } from '../../helpers/get_max_hallucination_failures_reached';
import { getMaxRetriesReached } from '../../helpers/get_max_retries_reached';
import { getRefineOrEndDecision } from './helpers/get_refine_or_end_decision';

export const getRefineOrEndEdge = <T extends GraphInsightTypes>(logger?: Logger) => {
  const edge = (state: BaseGraphState<T>): 'end' | 'refine' => {
    logger?.debug(() => '---REFINE OR END---');
    const {
      insights,
      generationAttempts,
      hallucinationFailures,
      maxGenerationAttempts,
      maxHallucinationFailures,
    } = state;

    const hasFinalResults = insights !== null;
    const maxRetriesReached = getMaxRetriesReached({ generationAttempts, maxGenerationAttempts });
    const maxHallucinationFailuresReached = getMaxHallucinationFailuresReached({
      hallucinationFailures,
      maxHallucinationFailures,
    });

    const decision = getRefineOrEndDecision({
      hasFinalResults,
      maxHallucinationFailuresReached,
      maxRetriesReached,
    });

    logger?.debug(
      () =>
        `refineOrEndEdge evaluated the following (derived) state:\n${JSON.stringify(
          {
            insights: insights?.length ?? 0,
            generationAttempts,
            hallucinationFailures,
            hasFinalResults,
            maxHallucinationFailuresReached,
            maxRetriesReached,
          },
          null,
          2
        )}
        \n---REFINE OR END: ${decision}---`
    );

    return decision;
  };

  return edge;
};
