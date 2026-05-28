/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRefineOrEndDecision } from '.';

describe('getRefineOrEndDecision', () => {
  it("returns 'end' when the refined results were generated", () => {
    const result = getRefineOrEndDecision({
      hasFinalResults: true,
      maxHallucinationFailuresReached: false,
      maxRetriesReached: false,
    });

    expect(result).toEqual('end');
  });

  describe('limits shared by both the generate and refine steps', () => {
    it("returns 'end' when the (shared) max hallucinations limit was reached", () => {
      const result = getRefineOrEndDecision({
        hasFinalResults: false,
        maxHallucinationFailuresReached: true,
        maxRetriesReached: false,
      });

      expect(result).toEqual('end');
    });

    it("returns 'end' when the (shared) max generation attempts limit was reached", () => {
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
        maxHallucinationFailuresReached: true, // <-- limit reached
        maxRetriesReached: true, // <-- another limit reached
      });

      expect(result).toEqual('end');
    });
  });

  it("returns 'refine' when there are unrefined results, and limits have NOT been reached", () => {
    const result = getRefineOrEndDecision({
      hasFinalResults: false,
      maxHallucinationFailuresReached: false,
      maxRetriesReached: false,
    });

    expect(result).toEqual('refine');
  });

  describe('getRefineOrEndDecision', () => {
    it("returns 'end' when the refined results were generated", () => {
      const result = getRefineOrEndDecision({
        hasFinalResults: true,
        maxHallucinationFailuresReached: false,
        maxRetriesReached: false,
      });

      expect(result).toEqual('end');
    });

    describe('limits shared by both the generate and refine steps', () => {
      it("returns 'end' when the (shared) max hallucinations limit was reached", () => {
        const result = getRefineOrEndDecision({
          hasFinalResults: false,
          maxHallucinationFailuresReached: true,
          maxRetriesReached: false,
        });

        expect(result).toEqual('end');
      });

      it("returns 'end' when the (shared) max generation attempts limit was reached", () => {
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
          maxHallucinationFailuresReached: true, // <-- limit reached
          maxRetriesReached: true, // <-- another limit reached
        });

        expect(result).toEqual('end');
      });
    });

    it("returns 'refine' when there are unrefined results, and limits have NOT been reached", () => {
      const result = getRefineOrEndDecision({
        hasFinalResults: false,
        maxHallucinationFailuresReached: false,
        maxRetriesReached: false,
      });

      expect(result).toEqual('refine');
    });
  });
});
