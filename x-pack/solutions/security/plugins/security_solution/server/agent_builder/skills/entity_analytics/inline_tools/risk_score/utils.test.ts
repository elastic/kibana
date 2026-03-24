/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '@kbn/entity-store/common';
import { getRiskFieldPaths, intervalToEsql } from './utils';

describe('Risk Score utils', () => {
  describe('intervalToEsql', () => {
    describe('valid intervals with singular unit (value 1)', () => {
      it.each([
        ['1s', 'NOW() - 1 second'],
        ['1m', 'NOW() - 1 minute'],
        ['1h', 'NOW() - 1 hour'],
        ['1d', 'NOW() - 1 day'],
        ['1w', 'NOW() - 1 week'],
        ['1M', 'NOW() - 1 month'],
      ] as const)('converts "%s" to "%s"', (interval, expected) => {
        expect(intervalToEsql(interval)).toBe(expected);
      });
    });

    describe('valid intervals with plural unit (value > 1)', () => {
      it.each([
        ['2s', 'NOW() - 2 seconds'],
        ['5m', 'NOW() - 5 minutes'],
        ['12h', 'NOW() - 12 hours'],
        ['30d', 'NOW() - 30 days'],
        ['4w', 'NOW() - 4 weeks'],
        ['6M', 'NOW() - 6 months'],
        ['60s', 'NOW() - 60 seconds'],
        ['24h', 'NOW() - 24 hours'],
        ['90d', 'NOW() - 90 days'],
      ] as const)('converts "%s" to "%s"', (interval, expected) => {
        expect(intervalToEsql(interval)).toBe(expected);
      });
    });

    describe('invalid format', () => {
      it.each([
        [''],
        ['1'],
        ['s'],
        ['m'],
        ['1 s'],
        ['1  d'],
        [' 1d'],
        ['1d '],
        ['1S'],
        ['1D'],
        ['1H'],
        ['1W'],
        ['abc'],
        ['d1'],
        ['-1d'],
        ['1.5d'],
      ])('throws for "%s"', (interval) => {
        expect(() => intervalToEsql(interval)).toThrow(
          new Error(`Invalid interval format: ${interval}`)
        );
      });
    });

    describe('edge cases', () => {
      it('handles zero value with plural unit', () => {
        expect(intervalToEsql('0s')).toBe('NOW() - 0 seconds');
      });

      it('handles large numeric values', () => {
        expect(intervalToEsql('999d')).toBe('NOW() - 999 days');
      });
    });
  });

  describe('getRiskFieldPaths', () => {
    const expectedKeys = [
      'scoreField',
      'levelField',
      'idValueField',
      'idFieldField',
      'inputsField',
      'calculatedScoreField',
      'notesField',
      'criticalityModifierField',
      'criticalityLevelField',
      'modifiersField',
    ] as const;

    it('returns all expected keys', () => {
      const paths = getRiskFieldPaths('host' as EntityType);
      expect(Object.keys(paths).sort()).toEqual([...expectedKeys].sort());
    });

    describe('host entity type', () => {
      it('returns paths prefixed with host.risk', () => {
        const paths = getRiskFieldPaths('host' as EntityType);
        const base = 'host.risk';
        expect(paths).toEqual({
          scoreField: `${base}.calculated_score_norm`,
          levelField: `${base}.calculated_level`,
          idValueField: `${base}.id_value`,
          idFieldField: `${base}.id_field`,
          inputsField: `${base}.inputs`,
          calculatedScoreField: `${base}.calculated_score`,
          notesField: `${base}.notes`,
          criticalityModifierField: `${base}.criticality_modifier`,
          criticalityLevelField: `${base}.criticality_level`,
          modifiersField: `${base}.modifiers`,
        });
      });
    });

    describe('user entity type', () => {
      it('returns paths prefixed with user.risk', () => {
        const paths = getRiskFieldPaths('user' as EntityType);
        const base = 'user.risk';
        expect(paths).toEqual({
          scoreField: `${base}.calculated_score_norm`,
          levelField: `${base}.calculated_level`,
          idValueField: `${base}.id_value`,
          idFieldField: `${base}.id_field`,
          inputsField: `${base}.inputs`,
          calculatedScoreField: `${base}.calculated_score`,
          notesField: `${base}.notes`,
          criticalityModifierField: `${base}.criticality_modifier`,
          criticalityLevelField: `${base}.criticality_level`,
          modifiersField: `${base}.modifiers`,
        });
      });
    });

    it('uses entityType in every path', () => {
      const entityType = 'host' as EntityType;
      const paths = getRiskFieldPaths(entityType);
      for (const value of Object.values(paths)) {
        expect(value).toMatch(new RegExp(`^${entityType}\\.risk\\.`));
      }
    });
  });
});
