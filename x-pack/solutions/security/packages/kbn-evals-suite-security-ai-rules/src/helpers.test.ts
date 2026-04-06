/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateEsqlSyntax,
  hasRequiredFields,
  calculateSetMetrics,
  extractMitreTechniques,
} from './helpers';

import type { ReferenceRule } from '../datasets/sample_rules';

describe('helpers', () => {
  describe('validateEsqlSyntax', () => {
    it('should validate a correct ES|QL query', () => {
      const query =
        'FROM logs-* | WHERE host.os.type == "windows" AND event.type == "start" | LIMIT 100';
      const result = validateEsqlSyntax(query);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate a minimal ES|QL FROM query', () => {
      const query = 'FROM .alerts-security.* METADATA _id | WHERE agent.type == "endpoint"';
      const result = validateEsqlSyntax(query);
      expect(result.valid).toBe(true);
    });

    it('should reject empty query', () => {
      const result = validateEsqlSyntax('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject EQL-style query that lacks a source command', () => {
      const query = 'process where host.os.type == "windows"';
      const result = validateEsqlSyntax(query);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should detect unbalanced parentheses', () => {
      const query = 'FROM logs-* | WHERE (host.os.type == "windows"';
      const result = validateEsqlSyntax(query);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('hasRequiredFields', () => {
    it('should detect all required fields present', () => {
      const rule: Partial<ReferenceRule> = {
        name: 'Test Rule',
        description: 'Test description',
        query: 'process where true',
        severity: 'medium',
        tags: ['test'],
        riskScore: 47,
      };
      const result = hasRequiredFields(rule);
      expect(result.hasAll).toBe(true);
      expect(result.coverage).toBe(1.0);
      expect(result.missing).toEqual([]);
    });

    it('should not treat riskScore=0 as missing', () => {
      const rule: Partial<ReferenceRule> = {
        name: 'Test Rule',
        description: 'Test description',
        query: 'process where true',
        severity: 'medium',
        tags: ['test'],
        riskScore: 0,
      };
      const result = hasRequiredFields(rule);
      expect(result.hasAll).toBe(true);
      expect(result.coverage).toBe(1.0);
      expect(result.missing).toEqual([]);
    });

    it('should detect missing fields', () => {
      const rule: Partial<ReferenceRule> = {
        name: 'Test Rule',
        query: 'process where true',
      };
      const result = hasRequiredFields(rule);
      expect(result.hasAll).toBe(false);
      expect(result.coverage).toBeLessThan(1.0);
      expect(result.missing).toContain('description');
      expect(result.missing).toContain('severity');
      expect(result.missing).toContain('tags');
    });
  });

  describe('calculateSetMetrics', () => {
    it('should calculate perfect match', () => {
      const predicted = new Set(['A', 'B', 'C']);
      const expected = new Set(['A', 'B', 'C']);
      const result = calculateSetMetrics(predicted, expected);
      expect(result.precision).toBe(1.0);
      expect(result.recall).toBe(1.0);
      expect(result.f1).toBe(1.0);
    });

    it('should calculate partial match', () => {
      const predicted = new Set(['A', 'B', 'D']);
      const expected = new Set(['A', 'B', 'C']);
      const result = calculateSetMetrics(predicted, expected);
      expect(result.precision).toBeCloseTo(2 / 3, 2);
      expect(result.recall).toBeCloseTo(2 / 3, 2);
      expect(result.f1).toBeCloseTo(2 / 3, 2);
    });

    it('should handle empty sets', () => {
      const predicted = new Set<string>();
      const expected = new Set<string>();
      const result = calculateSetMetrics(predicted, expected);
      expect(result.precision).toBe(1.0);
      expect(result.recall).toBe(1.0);
      expect(result.f1).toBe(1.0);
    });
  });

  describe('extractMitreTechniques', () => {
    it('should extract techniques from rule', () => {
      const rule: Partial<ReferenceRule> = {
        threat: [
          { technique: 'T1003.001', tactic: 'TA0006' },
          { technique: 'T1005', tactic: 'TA0009' },
        ],
      };
      const techniques = extractMitreTechniques(rule);
      expect(techniques.size).toBe(2);
      expect(techniques.has('T1003.001')).toBe(true);
      expect(techniques.has('T1005')).toBe(true);
    });

    it('should also extract subtechnique IDs', () => {
      const rule: Partial<ReferenceRule> = {
        threat: [{ technique: 'T1560', tactic: 'TA0009', subtechnique: 'T1560.001' }],
      };
      const techniques = extractMitreTechniques(rule);
      expect(techniques.has('T1560')).toBe(true);
      expect(techniques.has('T1560.001')).toBe(true);
    });

    it('should ignore empty-string techniques', () => {
      const rule: Partial<ReferenceRule> = {
        threat: [{ technique: '', tactic: 'TA0009' }],
      };
      const techniques = extractMitreTechniques(rule);
      expect(techniques.size).toBe(0);
    });

    it('should ignore non-MITRE-ID subtechnique values', () => {
      const rule: Partial<ReferenceRule> = {
        threat: [{ technique: 'T1560.001', tactic: 'TA0009', subtechnique: 'Archive via Utility' }],
      };
      const techniques = extractMitreTechniques(rule);
      expect(techniques.size).toBe(1);
      expect(techniques.has('T1560.001')).toBe(true);
      expect(techniques.has('Archive via Utility')).toBe(false);
    });

    it('should handle rule without threat', () => {
      const rule: Partial<ReferenceRule> = {};
      const techniques = extractMitreTechniques(rule);
      expect(techniques.size).toBe(0);
    });
  });
});
