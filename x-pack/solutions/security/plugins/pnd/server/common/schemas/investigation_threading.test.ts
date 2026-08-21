/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  investigationThreadIdSchema,
  validateInvestigationThreadId,
} from './investigation_threading';

describe('investigation_threading', () => {
  const validInput = {
    investigationId: 'inv-1',
    sourceWatch: 'watch-floor' as const,
    createdAt: '2026-08-18T12:00:00Z',
  };

  describe('investigationThreadIdSchema', () => {
    it('parses a valid thread id', () => {
      const result = investigationThreadIdSchema.parse(validInput);
      expect(result.investigationId).toBe('inv-1');
      expect(result.sourceWatch).toBe('watch-floor');
    });

    it('parses with optional parentThreadRef', () => {
      const result = investigationThreadIdSchema.parse({
        ...validInput,
        parentThreadRef: 'thread-prev-1',
      });
      expect(result.parentThreadRef).toBe('thread-prev-1');
    });

    it('throws on missing investigationId', () => {
      expect(() =>
        investigationThreadIdSchema.parse({ ...validInput, investigationId: undefined })
      ).toThrow();
    });

    it('throws on missing sourceWatch', () => {
      expect(() =>
        investigationThreadIdSchema.parse({ ...validInput, sourceWatch: undefined })
      ).toThrow();
    });

    it('throws on invalid sourceWatch enum', () => {
      expect(() =>
        investigationThreadIdSchema.parse({ ...validInput, sourceWatch: 'invalid-watch' })
      ).toThrow();
    });

    it('throws on empty object', () => {
      expect(() => investigationThreadIdSchema.parse({})).toThrow();
    });
  });

  describe('validateInvestigationThreadId', () => {
    it('returns parsed thread id for valid input', () => {
      const result = validateInvestigationThreadId(validInput);
      expect(result.investigationId).toBe('inv-1');
    });

    it('throws for empty input', () => {
      expect(() => validateInvestigationThreadId({})).toThrow();
    });
  });
});
