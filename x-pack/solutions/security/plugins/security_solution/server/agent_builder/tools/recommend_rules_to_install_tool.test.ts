/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRuleAsset } from '../../lib/detection_engine/prebuilt_rules/model/rule_assets/prebuilt_rule_asset';
import { preRankCandidateRules } from './recommend_rules_to_install_tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRule = (
  overrides: Partial<PrebuiltRuleAsset> & { rule_id: string }
): PrebuiltRuleAsset => ({
  name: `Rule ${overrides.rule_id}`,
  description: 'A test rule',
  severity: 'medium',
  risk_score: 50,
  version: 1,
  author: [],
  license: 'Elastic License v2',
  type: 'query',
  query: '*',
  language: 'kuery',
  index: ['logs-*'],
  required_fields: [{ name: 'host.name', type: 'keyword' }],
  ...overrides,
} as PrebuiltRuleAsset);

const tactic = (id: string, name: string) => ({
  framework: 'MITRE ATT&CK',
  tactic: { id, name, reference: `https://attack.mitre.org/tactics/${id}/` },
  technique: [],
});

const coverage = (
  id: string,
  name: string,
  installed_count: number
): Record<string, { name: string; installed_count: number }> => ({
  [id]: { name, installed_count },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('preRankCandidateRules', () => {
  describe('empty inputs', () => {
    it('returns empty recommendations when there are no runnable rules', () => {
      const result = preRankCandidateRules([], {});

      expect(result.recommendations).toEqual([]);
      expect(result.allocationsByTactic).toEqual({});
    });

    it('returns empty recommendations when rules have no threat mappings', () => {
      const rules = [
        makeRule({ rule_id: 'r1', threat: [] }),
        makeRule({ rule_id: 'r2', threat: undefined }),
      ];

      const result = preRankCandidateRules(rules, {});

      expect(result.recommendations).toEqual([]);
    });

    it('returns zero allocations for installed-only tactics when no candidates exist', () => {
      const result = preRankCandidateRules(
        [],
        coverage('TA0001', 'Initial Access', 2)
      );

      expect(result.recommendations).toEqual([]);
      expect(result.allocationsByTactic['TA0001']).toBe(0);
    });
  });

  describe('tactic weight', () => {
    it('assigns EMPTY weight (3) when no rules are installed for a tactic', () => {
      // Two tactics: TA0001 empty (weight 3), TA0002 covered (weight 1).
      // With only 4 total points and budget=200 they each get clamped to MAX,
      // but the proportional share for empty tactic is 3x the covered tactic.
      const emptyTacticRule = makeRule({ rule_id: 'r1', threat: [tactic('TA0001', 'InitAccess')] });
      const coveredTacticRule = makeRule({
        rule_id: 'r2',
        threat: [tactic('TA0002', 'Execution')],
      });

      const result = preRankCandidateRules(
        [emptyTacticRule, coveredTacticRule],
        // TA0001 has 0 installed → empty weight; TA0002 has 5 installed → covered weight
        { ...coverage('TA0002', 'Execution', 5) },
        200
      );

      // TA0001 proportional = floor(3/4 * 200) = 150, clamped to MAX_PER_TACTIC=25
      // TA0002 proportional = floor(1/4 * 200) = 50, clamped to MAX_PER_TACTIC=25
      // Both get allocation 1 (only 1 candidate each)
      expect(result.allocationsByTactic['TA0001']).toBe(1);
      expect(result.allocationsByTactic['TA0002']).toBe(1);
    });

    it('assigns SPARSE weight (2) when installed_count is between 1 and SPARSE_INSTALLED_THRESHOLD (3)', () => {
      const ruleA = makeRule({ rule_id: 'rA', threat: [tactic('TA0001', 'InitAccess')] });
      const ruleB = makeRule({ rule_id: 'rB', threat: [tactic('TA0002', 'Execution')] });

      const result = preRankCandidateRules(
        [ruleA, ruleB],
        // TA0001: sparse (2 installed) → weight 2; TA0002: covered (10 installed) → weight 1
        { ...coverage('TA0001', 'InitAccess', 2), ...coverage('TA0002', 'Execution', 10) },
        200
      );

      // totalPoints = 2+1 = 3
      // TA0001 proportional = floor(2/3 * 200) = 133, clamped to 25, bound by 1 candidate → 1
      // TA0002 proportional = floor(1/3 * 200) = 66, clamped to 25, bound by 1 candidate → 1
      expect(result.allocationsByTactic['TA0001']).toBe(1);
      expect(result.allocationsByTactic['TA0002']).toBe(1);
      // Both rules appear in recommendations
      expect(result.recommendations).toHaveLength(2);
    });
  });

  describe('MIN_PER_TACTIC clamp', () => {
    it('raises allocation to MIN_PER_TACTIC (3) even when proportional share is smaller', () => {
      // 10 tactics sharing a budget of 30 → each gets floor(weight/totalPoints*30)
      // With equal weights (all empty, weight=3), each gets floor(1/10*30)=3, exactly MIN.
      // Let's use many tactics and a small budget to force proportional < 3.
      const rules = Array.from({ length: 10 }, (_, i) =>
        makeRule({
          rule_id: `r${i}`,
          risk_score: 50,
          threat: [tactic(`TA000${i}`, `Tactic ${i}`)],
        })
      );
      // Give each tactic plenty of candidates so candidateCount doesn't limit
      const manyRules = rules.flatMap((r) =>
        Array.from({ length: 5 }, (_, j) =>
          makeRule({
            rule_id: `${r.rule_id}-clone-${j}`,
            risk_score: 50,
            threat: r.threat,
          })
        )
      );

      // With 10 equal-weight tactics and budget=10, proportional per tactic = floor(1/10*10)=1
      // but it should be clamped up to MIN=3
      const result = preRankCandidateRules([...rules, ...manyRules], {}, 10);

      for (let i = 0; i < 10; i++) {
        const alloc = result.allocationsByTactic[`TA000${i}`];
        expect(alloc).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('MAX_PER_TACTIC clamp', () => {
    it('caps allocation at MAX_PER_TACTIC (25) when proportional share would exceed it', () => {
      // One tactic with budget=200 and many candidates: proportional = 200, clamped to 25
      const rules = Array.from({ length: 50 }, (_, i) =>
        makeRule({ rule_id: `r${i}`, threat: [tactic('TA0001', 'InitAccess')] })
      );

      const result = preRankCandidateRules(rules, {}, 200);

      expect(result.allocationsByTactic['TA0001']).toBe(25);
      expect(result.recommendations).toHaveLength(25);
    });
  });

  describe('candidate count bound', () => {
    it('takes only available candidates when fewer than allocation', () => {
      // Two rules for one tactic; allocation would be clamped to MIN=3 but only 2 candidates.
      const rules = [
        makeRule({ rule_id: 'r1', threat: [tactic('TA0001', 'InitAccess')] }),
        makeRule({ rule_id: 'r2', threat: [tactic('TA0001', 'InitAccess')] }),
      ];

      const result = preRankCandidateRules(rules, {}, 200);

      expect(result.allocationsByTactic['TA0001']).toBe(2);
      expect(result.recommendations).toHaveLength(2);
    });
  });

  describe('risk_score sorting', () => {
    it('picks highest risk_score rules first within a tactic', () => {
      const rules = [
        makeRule({ rule_id: 'low', risk_score: 20, threat: [tactic('TA0001', 'InitAccess')] }),
        makeRule({ rule_id: 'high', risk_score: 90, threat: [tactic('TA0001', 'InitAccess')] }),
        makeRule({ rule_id: 'mid', risk_score: 55, threat: [tactic('TA0001', 'InitAccess')] }),
      ];

      // Force allocation to 2 to test that only top-2 by risk_score are chosen
      const result = preRankCandidateRules(rules, {}, 6); // budget=6, 1 tactic → floor(1/1*6)=6, clamped to MAX, bound by 3 → all 3
      const ids = result.recommendations.map((r) => r.rule_id);

      // When all 3 fit, order should be high→mid→low
      expect(ids).toEqual(['high', 'mid', 'low']);
    });

    it('handles missing risk_score by treating it as 0', () => {
      const ruleWithScore = makeRule({
        rule_id: 'has-score',
        risk_score: 70,
        threat: [tactic('TA0001', 'InitAccess')],
      });
      const { risk_score: _, ...withoutScore } = ruleWithScore;
      const ruleWithoutScore = withoutScore as PrebuiltRuleAsset;
      ruleWithoutScore.rule_id = 'no-score';

      const result = preRankCandidateRules([ruleWithoutScore, ruleWithScore], {}, 200);

      const ids = result.recommendations.map((r) => r.rule_id);
      expect(ids[0]).toBe('has-score');
      expect(ids[1]).toBe('no-score');
    });
  });

  describe('multi-tactic rules', () => {
    it('deduplicates a rule that maps to multiple tactics in the final output', () => {
      const sharedRule = makeRule({
        rule_id: 'shared',
        risk_score: 80,
        threat: [tactic('TA0001', 'InitAccess'), tactic('TA0002', 'Execution')],
      });

      const result = preRankCandidateRules([sharedRule], {}, 200);

      // The rule appears in both tactic buckets but should appear only once in recommendations
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].rule_id).toBe('shared');
    });

    it('counts per-tactic allocations independently from dedup', () => {
      const sharedRule = makeRule({
        rule_id: 'shared',
        threat: [tactic('TA0001', 'InitAccess'), tactic('TA0002', 'Execution')],
      });

      const result = preRankCandidateRules([sharedRule], {}, 200);

      // Both tactics get an allocation of 1 (bounded by candidate count)
      expect(result.allocationsByTactic['TA0001']).toBe(1);
      expect(result.allocationsByTactic['TA0002']).toBe(1);
    });

    it('deduplicates when the same tactic appears twice in a single rule threat array', () => {
      const rule = makeRule({
        rule_id: 'dup-tactic',
        threat: [
          tactic('TA0001', 'InitAccess'),
          tactic('TA0001', 'InitAccess'), // duplicate tactic in same rule
        ],
      });

      const result = preRankCandidateRules([rule], {}, 200);

      // Rule is in the TA0001 bucket only once; allocation bounded to 1 candidate
      expect(result.allocationsByTactic['TA0001']).toBe(1);
      expect(result.recommendations).toHaveLength(1);
    });
  });

  describe('installed-only tactics', () => {
    it('includes tactics with no candidates in allocationsByTactic with allocation 0', () => {
      const rule = makeRule({ rule_id: 'r1', threat: [tactic('TA0002', 'Execution')] });

      const result = preRankCandidateRules(
        [rule],
        { ...coverage('TA0001', 'InitAccess', 5), ...coverage('TA0002', 'Execution', 0) },
        200
      );

      expect(result.allocationsByTactic['TA0001']).toBe(0);
      expect(result.allocationsByTactic['TA0002']).toBe(1);
    });

    it('does not let installed-only tactics consume budget from tactics with candidates', () => {
      // TA0001 has installed rules but no candidates; TA0002 has candidates.
      // totalPoints should only count TA0002 so TA0002 gets the full budget.
      const rules = Array.from({ length: 30 }, (_, i) =>
        makeRule({ rule_id: `r${i}`, threat: [tactic('TA0002', 'Execution')] })
      );

      const result = preRankCandidateRules(
        rules,
        // TA0001 covered (weight 1) but no candidates; TA0002 empty (weight 3, no installed)
        { ...coverage('TA0001', 'InitAccess', 10) },
        200
      );

      // TA0002 weight=3 (empty), totalPoints=3 (TA0001 excluded because no candidates)
      // proportional = floor(3/3 * 200) = 200, clamped to 25
      expect(result.allocationsByTactic['TA0002']).toBe(25);
      expect(result.allocationsByTactic['TA0001']).toBe(0);
    });
  });

  describe('proportional budget split across multiple tactics', () => {
    it('allocates proportionally based on weights when totalPoints > 0', () => {
      // TA0001: 0 installed → weight 3; TA0002: 1 installed → weight 2; TA0003: 5 installed → weight 1
      // totalPoints = 6, budget = 60
      // TA0001 proportional = floor(3/6*60) = 30, clamped to 25
      // TA0002 proportional = floor(2/6*60) = 20, clamped to MAX... 20 > MIN, so stays 20
      // TA0003 proportional = floor(1/6*60) = 10, stays 10
      const rulesForTA0001 = Array.from({ length: 30 }, (_, i) =>
        makeRule({ rule_id: `ta1-r${i}`, threat: [tactic('TA0001', 'InitAccess')] })
      );
      const rulesForTA0002 = Array.from({ length: 25 }, (_, i) =>
        makeRule({ rule_id: `ta2-r${i}`, threat: [tactic('TA0002', 'Execution')] })
      );
      const rulesForTA0003 = Array.from({ length: 15 }, (_, i) =>
        makeRule({ rule_id: `ta3-r${i}`, threat: [tactic('TA0003', 'Persistence')] })
      );

      const result = preRankCandidateRules(
        [...rulesForTA0001, ...rulesForTA0002, ...rulesForTA0003],
        { ...coverage('TA0002', 'Execution', 1), ...coverage('TA0003', 'Persistence', 5) },
        60
      );

      expect(result.allocationsByTactic['TA0001']).toBe(25); // clamped from 30
      expect(result.allocationsByTactic['TA0002']).toBe(20);
      expect(result.allocationsByTactic['TA0003']).toBe(10);
    });
  });

  describe('deduplication and output count', () => {
    it('final recommendation count can be under budget due to cross-tactic deduplication', () => {
      // One rule covers both tactics; each tactic gets allocation=1 but there's only 1 unique rule
      const sharedRule = makeRule({
        rule_id: 'shared',
        threat: [tactic('TA0001', 'InitAccess'), tactic('TA0002', 'Execution')],
      });

      const result = preRankCandidateRules([sharedRule], {}, 200);

      expect(result.recommendations).toHaveLength(1);
    });

    it('preserves first-occurrence order across tactics for deduplication', () => {
      // Rule appears in TA0001 and TA0002. TA0001 is iterated first.
      const rule = makeRule({
        rule_id: 'multi',
        threat: [tactic('TA0001', 'InitAccess'), tactic('TA0002', 'Execution')],
      });
      const ta2OnlyRule = makeRule({ rule_id: 'ta2-only', threat: [tactic('TA0002', 'Execution')] });

      const result = preRankCandidateRules([rule, ta2OnlyRule], {}, 200);

      const ids = result.recommendations.map((r) => r.rule_id);
      // 'multi' should appear exactly once
      expect(ids.filter((id) => id === 'multi')).toHaveLength(1);
    });
  });
});
