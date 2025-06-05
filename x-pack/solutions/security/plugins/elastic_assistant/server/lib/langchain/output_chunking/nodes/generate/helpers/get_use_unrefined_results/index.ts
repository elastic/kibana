/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphInsightTypes } from '../../../../../graphs';
import { getMaxRetriesReached } from '../../../../helpers/get_max_retries_reached';

export const getUseUnrefinedResults = <T extends GraphInsightTypes>({
  generationAttempts,
  maxGenerationAttempts,
  unrefinedResults,
}: {
  generationAttempts: number;
  maxGenerationAttempts: number;
  unrefinedResults: T[] | null;
}): boolean => {
  const nextAttemptWouldExcedLimit = getMaxRetriesReached({
    generationAttempts: generationAttempts + 1, // + 1, because we just used an attempt
    maxGenerationAttempts,
  });

  return nextAttemptWouldExcedLimit && unrefinedResults != null && unrefinedResults.length > 0;
};
