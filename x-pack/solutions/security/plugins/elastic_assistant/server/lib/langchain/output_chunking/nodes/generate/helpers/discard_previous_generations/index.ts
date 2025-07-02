/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseGraphState, GraphInsightTypes } from '../../../../../graphs';

export const discardPreviousGenerations = <T extends GraphInsightTypes>({
  generationAttempts,
  hallucinationFailures,
  isHallucinationDetected,
  state,
}: {
  generationAttempts: number;
  hallucinationFailures: number;
  isHallucinationDetected: boolean;
  state: BaseGraphState<T>;
}): BaseGraphState<T> => {
  return {
    ...state,
    combinedGenerations: '', // <-- reset the combined generations
    generationAttempts: generationAttempts + 1,
    generations: [], // <-- reset the generations
    hallucinationFailures: isHallucinationDetected
      ? hallucinationFailures + 1
      : hallucinationFailures,
  };
};
