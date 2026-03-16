/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PrebuiltRuleAsset } from '../../../prebuilt_rules/model/rule_assets/prebuilt_rule_asset';
import { PREBUILT_CORRELATION_RULES } from './rules';

const MITRE_TACTIC_ID_PATTERN = /^TA\d{4}$/;
const MITRE_TECHNIQUE_ID_PATTERN = /^T\d{4}(\.\d{3})?$/;
const TIMESPAN_PATTERN = /^\d+[smhd]$/;

const SEVERITY_RISK_RANGES: Record<string, { min: number; max: number }> = {
  low: { min: 1, max: 24 },
  medium: { min: 25, max: 49 },
  high: { min: 50, max: 74 },
  critical: { min: 75, max: 100 },
};

describe('Prebuilt correlation rules', () => {
  it('should define at least one rule', () => {
    expect(PREBUILT_CORRELATION_RULES.length).toBeGreaterThan(0);
  });

  it('should have unique rule_ids', () => {
    const ids = PREBUILT_CORRELATION_RULES.map((r) => r.rule_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(PREBUILT_CORRELATION_RULES.map((rule) => [rule.rule_id, rule]))(
    'rule %s',
    (_ruleId, rule) => {
      it('should parse successfully against the PrebuiltRuleAsset schema', () => {
        const result = PrebuiltRuleAsset.safeParse(rule);
        if (!result.success) {
          throw new Error(
            `Rule ${rule.rule_id} failed schema validation: ${JSON.stringify(
              result.error.issues,
              null,
              2
            )}`
          );
        }
        expect(result.success).toBe(true);
      });

      it('should have type "correlation"', () => {
        expect(rule.type).toBe('correlation');
      });

      it('should have language "esql"', () => {
        expect((rule as { language: string }).language).toBe('esql');
      });

      it('should have a non-empty correlation.rules array', () => {
        expect(rule).toHaveProperty('correlation');
        const { correlation } = rule as { correlation: { rules: string[] } };
        expect(Array.isArray(correlation.rules)).toBe(true);
        expect(correlation.rules.length).toBeGreaterThan(0);
      });

      it('should have a non-empty correlation.group_by array', () => {
        const { correlation } = rule as { correlation: { group_by: string[] } };
        expect(Array.isArray(correlation.group_by)).toBe(true);
        expect(correlation.group_by.length).toBeGreaterThan(0);
      });

      it('should have a timespan matching the expected format', () => {
        const { correlation } = rule as { correlation: { timespan: string } };
        expect(correlation.timespan).toMatch(TIMESPAN_PATTERN);
      });

      it('should have a risk_score within the valid range (0-100)', () => {
        expect(rule.risk_score).toBeGreaterThanOrEqual(0);
        expect(rule.risk_score).toBeLessThanOrEqual(100);
      });

      it('should have a risk_score appropriate for its severity', () => {
        const range = SEVERITY_RISK_RANGES[rule.severity];
        expect(range).toBeDefined();
        expect(rule.risk_score).toBeGreaterThanOrEqual(range.min);
        expect(rule.risk_score).toBeLessThanOrEqual(range.max);
      });

      it('should have valid MITRE ATT&CK threat mappings', () => {
        expect(rule.threat).toBeDefined();
        expect(rule.threat!.length).toBeGreaterThan(0);

        for (const entry of rule.threat!) {
          expect(entry.framework).toBe('MITRE ATT&CK');

          expect(entry.tactic.id).toMatch(MITRE_TACTIC_ID_PATTERN);
          expect(entry.tactic.name).toBeTruthy();
          expect(entry.tactic.reference).toContain('https://attack.mitre.org/tactics/');

          if (entry.technique && entry.technique.length > 0) {
            for (const technique of entry.technique) {
              expect(technique.id).toMatch(MITRE_TECHNIQUE_ID_PATTERN);
              expect(technique.name).toBeTruthy();
              expect(technique.reference).toContain('https://attack.mitre.org/techniques/');

              if (technique.subtechnique && technique.subtechnique.length > 0) {
                for (const sub of technique.subtechnique) {
                  expect(sub.id).toMatch(MITRE_TECHNIQUE_ID_PATTERN);
                  expect(sub.name).toBeTruthy();
                  expect(sub.reference).toContain('https://attack.mitre.org/techniques/');
                }
              }
            }
          }
        }
      });

      it('should have required metadata fields', () => {
        expect(rule.author).toBeDefined();
        expect(rule.author!.length).toBeGreaterThan(0);
        expect(rule.license).toBe('Elastic License v2');
        expect(rule.version).toBeGreaterThanOrEqual(1);
        expect(rule.tags).toBeDefined();
        expect(rule.tags!.length).toBeGreaterThan(0);
      });

      it('should have a non-empty description', () => {
        expect(rule.description.length).toBeGreaterThan(50);
      });

      it('should have an investigation guide in the note field', () => {
        expect(rule.note).toBeDefined();
        expect(rule.note!.length).toBeGreaterThan(0);
        expect(rule.note).toContain('## Investigation Guide');
      });
    }
  );
});
