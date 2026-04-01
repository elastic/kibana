/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getShouldEnd } from '../get_should_end';

export const getRefineOrEndDecision = ({
  hasFinalResults,
  maxHallucinationFailuresReached,
  maxRetriesReached,
}: {
  hasFinalResults: boolean;
  maxHallucinationFailuresReached: boolean;
  maxRetriesReached: boolean;
}): 'refine' | 'end' =>
  getShouldEnd({
    hasFinalResults,
    maxHallucinationFailuresReached,
    maxRetriesReached,
  })
    ? 'end'
    : 'refine';
