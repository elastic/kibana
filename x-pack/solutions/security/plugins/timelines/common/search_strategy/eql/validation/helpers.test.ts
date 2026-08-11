/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValidationErrors, isErrorResponse, isValidationErrorResponse } from './helpers';
import {
  getEqlResponseWithNonValidationError,
  getEqlResponseWithValidationError,
  getEqlResponseWithValidationErrors,
  getValidEqlResponse,
} from './helpers.mock';

describe('eql validation helpers', () => {
  describe('isErrorResponse', () => {
    it('is false for a regular response', () => {
      expect(isErrorResponse(getValidEqlResponse())).toEqual(false);
    });

    it('is true for a response with non-validation errors', () => {
      expect(isErrorResponse(getEqlResponseWithNonValidationError())).toEqual(true);
    });

    it('is true for a response with validation errors', () => {
      expect(isErrorResponse(getEqlResponseWithValidationError())).toEqual(true);
    });
  });

  describe('isValidationErrorResponse', () => {
    it('is false for a regular response', () => {
      expect(isValidationErrorResponse(getValidEqlResponse())).toEqual(false);
    });

    it('is false for a response with non-validation errors', () => {
      expect(isValidationErrorResponse(getEqlResponseWithNonValidationError())).toEqual(false);
    });

    it('is true for a response with validation errors', () => {
      expect(isValidationErrorResponse(getEqlResponseWithValidationError())).toEqual(true);
    });
  });

  describe('getValidationErrors', () => {
    it('returns a single error for a single root cause', () => {
      expect(getValidationErrors(getEqlResponseWithValidationError())).toEqual([
        'Found 2 problems\nline 1:1: Unknown column [event.category]\nline 1:13: Unknown column [event.name]',
      ]);
    });

    it('returns multiple errors for multiple root causes', () => {
      expect(getValidationErrors(getEqlResponseWithValidationErrors())).toEqual([
        'Found 2 problems\nline 1:1: Unknown column [event.category]\nline 1:13: Unknown column [event.name]',
        "line 1:4: mismatched input '<EOF>' expecting 'where'",
      ]);
    });
  });
});
