/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getShouldEnd } from '../get_should_end';

export const getGenerateOrRefineOrEndDecision = ({
  hasUnrefinedResults,
  hasZeroDocs,
  maxHallucinationFailuresReached,
  maxRetriesReached,
}: {
  hasUnrefinedResults: boolean;
  hasZeroDocs: boolean;
  maxHallucinationFailuresReached: boolean;
  maxRetriesReached: boolean;
}): 'end' | 'generate' | 'refine' => {
  if (getShouldEnd({ hasZeroDocs, maxHallucinationFailuresReached, maxRetriesReached })) {
    return 'end';
  }

  if (hasUnrefinedResults) {
    return 'refine';
  }

  return 'generate';
};
