/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRefineOrEndDecision } from '.';

describe('getRefineOrEndDecision', () => {
  it("returns 'end' when there are final results", () => {
    const result = getRefineOrEndDecision({
      hasFinalResults: true,
      maxHallucinationFailuresReached: false,
      maxRetriesReached: false,
    });

    expect(result).toEqual('end');
  });

  describe('limits shared by both the generate and refine steps', () => {
    it("returns 'end' when the max hallucinations limit is reached", () => {
      const result = getRefineOrEndDecision({
        hasFinalResults: false,
        maxHallucinationFailuresReached: true,
        maxRetriesReached: false,
      });

      expect(result).toEqual('end');
    });

    it("returns 'end' when the max generation attempts limit is reached", () => {
      const result = getRefineOrEndDecision({
        hasFinalResults: false,
        maxHallucinationFailuresReached: false,
        maxRetriesReached: true,
      });

      expect(result).toEqual('end');
    });

    it("returns 'end' when multiple limits are reached", () => {
      const result = getRefineOrEndDecision({
        hasFinalResults: false,
        maxHallucinationFailuresReached: true,
        maxRetriesReached: true,
      });

      expect(result).toEqual('end');
    });
  });

  it("returns 'refine' when no final results and no limits reached", () => {
    const result = getRefineOrEndDecision({
      hasFinalResults: false,
      maxHallucinationFailuresReached: false,
      maxRetriesReached: false,
    });

    expect(result).toEqual('refine');
  });
});
