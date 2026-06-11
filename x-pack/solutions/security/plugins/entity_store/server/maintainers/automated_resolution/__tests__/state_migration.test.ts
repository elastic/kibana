/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { migrateAutomatedResolutionState } from '../state_migration';
import { STAGE_0_RULE_IDS } from '../rules_config';

const logger = loggerMock.create();

describe('migrateAutomatedResolutionState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SCENARIO 1 — Clean upgrade from 9.4 state', () => {
    it('moves S1 watermark from top level to rules.S1', () => {
      const oldState = {
        lastProcessedTimestamp: '2026-05-30T10:00:00Z',
        lastRun: { resolutionsCreated: 42, skippedAmbiguousBuckets: 3 },
      };

      const result = migrateAutomatedResolutionState(oldState, logger);

      expect(result.rules.S1.lastProcessedTimestamp).toBe('2026-05-30T10:00:00Z');
      expect(result.rules.S1.lastRun).toEqual({ resolutionsCreated: 42, skippedAmbiguousBuckets: 3 });
    });

    it('initialises S2, S3, CF1, CF4 to null watermarks', () => {
      const oldState = { lastProcessedTimestamp: '2026-05-30T10:00:00Z', lastRun: null };
      const result = migrateAutomatedResolutionState(oldState, logger);

      for (const id of STAGE_0_RULE_IDS) {
        if (id === 'S1') continue;
        expect(result.rules[id].lastProcessedTimestamp).toBeNull();
        expect(result.rules[id].lastRun).toBeNull();
      }
    });

    it('removes top-level lastProcessedTimestamp and lastRun fields', () => {
      const oldState = { lastProcessedTimestamp: '2026-05-30T10:00:00Z', lastRun: null };
      const result = migrateAutomatedResolutionState(oldState, logger);

      expect(result).not.toHaveProperty('lastProcessedTimestamp');
      expect(result).not.toHaveProperty('lastRun');
    });
  });

  describe('SCENARIO 2 — Already migrated (idempotency)', () => {
    it('is a no-op when state is already in new shape', () => {
      const newState = {
        rules: {
          S1: { lastProcessedTimestamp: '2026-05-30T10:00:00Z', lastRun: { resolutionsCreated: 10, skippedAmbiguousBuckets: 1 } },
          S2: { lastProcessedTimestamp: null, lastRun: null },
          S3: { lastProcessedTimestamp: null, lastRun: null },
          CF1: { lastProcessedTimestamp: null, lastRun: null },
          CF4: { lastProcessedTimestamp: null, lastRun: null },
        },
      };

      const result = migrateAutomatedResolutionState(newState, logger);
      const resultTwice = migrateAutomatedResolutionState(result, logger);

      expect(JSON.stringify(result)).toBe(JSON.stringify(resultTwice));
      expect(result.rules.S1.lastProcessedTimestamp).toBe('2026-05-30T10:00:00Z');
    });
  });

  describe('SCENARIO 3 — Empty / fresh install', () => {
    it.each([{}, null, undefined])('initialises all 5 rules from empty input: %p', (input) => {
      const result = migrateAutomatedResolutionState(input as any, logger);

      for (const id of STAGE_0_RULE_IDS) {
        expect(result.rules[id].lastProcessedTimestamp).toBeNull();
        expect(result.rules[id].lastRun).toBeNull();
      }
    });
  });

  describe('SCENARIO 4 — Partial migration retry', () => {
    it('prefers existing rules.S1 over old top-level state', () => {
      const conflictState = {
        lastProcessedTimestamp: '2026-01-01T00:00:00Z',
        lastRun: null,
        rules: {
          S1: { lastProcessedTimestamp: '2026-05-30T10:00:00Z', lastRun: null },
        },
      };

      const result = migrateAutomatedResolutionState(conflictState, logger);

      expect(result.rules.S1.lastProcessedTimestamp).toBe('2026-05-30T10:00:00Z');
    });

    it('fills in missing Stage 0 rule states from a partial rules object', () => {
      const partialState = {
        rules: {
          S1: { lastProcessedTimestamp: '2026-05-30T10:00:00Z', lastRun: null },
        },
      };

      const result = migrateAutomatedResolutionState(partialState, logger);

      expect(result.rules.S2.lastProcessedTimestamp).toBeNull();
      expect(result.rules.CF4.lastProcessedTimestamp).toBeNull();
    });
  });

  describe('SCENARIO 5 — Malformed timestamp', () => {
    it('normalises a malformed timestamp to null and logs a warning', () => {
      const state = { lastProcessedTimestamp: 'not-a-date', lastRun: null };
      const result = migrateAutomatedResolutionState(state, logger);

      expect(result.rules.S1.lastProcessedTimestamp).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Dropping malformed automated-resolution timestamp')
      );
    });
  });

  describe('SCENARIO 6 — Unknown fields preserved', () => {
    it('preserves unknown top-level fields', () => {
      const state = {
        lastProcessedTimestamp: null,
        lastRun: null,
        customDebugField: 'some-value',
      };

      const result = migrateAutomatedResolutionState(state as any, logger);

      expect((result as any).customDebugField).toBe('some-value');
    });
  });
});
