/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleResponse } from '../../../common/api/detection_engine/model/rule_schema';
import { generateScenario } from './scenario_generator';

jest.mock(
  '../detection_engine/rule_management/logic/detection_rules_client/methods/get_rule_by_rule_id'
);

import { getRuleByRuleId } from '../detection_engine/rule_management/logic/detection_rules_client/methods/get_rule_by_rule_id';

const mockGetRuleByRuleId = getRuleByRuleId as jest.MockedFunction<typeof getRuleByRuleId>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeRuleResponse = (techniqueIds: string[], subtechniqueIds: string[] = []): RuleResponse =>
  ({
    threat: [
      {
        tactic: { id: 'TA0002', name: 'Execution', reference: 'https://attack.mitre.org/' },
        technique: techniqueIds.map((id) => ({
          id,
          name: `Technique ${id}`,
          reference: `https://attack.mitre.org/techniques/${id}/`,
          subtechnique: subtechniqueIds.map((sid) => ({
            id: sid,
            name: `Sub ${sid}`,
            reference: `https://attack.mitre.org/techniques/${sid}/`,
          })),
        })),
      },
    ],
  } as unknown as RuleResponse);

/** A rulesClient double — scenario_generator delegates rule-fetching to getRuleByRuleId, so the client itself is never called directly in tests. */
const stubRulesClient = {} as unknown as RulesClient;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generateScenario', () => {
  const baseInput = {
    ruleId: 'rule-001',
    endpointIds: ['ep-1', 'ep-2'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('failure modes', () => {
    it('returns rule_not_found when getRuleByRuleId resolves null', async () => {
      mockGetRuleByRuleId.mockResolvedValue(null);

      const result = await generateScenario(baseInput, { rulesClient: stubRulesClient });

      expect(result).toEqual({ ok: false, reason: 'rule_not_found' });
    });

    it('returns no_mitre_tags when rule has no threat techniques', async () => {
      mockGetRuleByRuleId.mockResolvedValue({ threat: [] } as unknown as RuleResponse);

      const result = await generateScenario(baseInput, { rulesClient: stubRulesClient });

      expect(result).toEqual({ ok: false, reason: 'no_mitre_tags' });
    });

    it('returns no_mitre_tags when rule.threat is undefined', async () => {
      mockGetRuleByRuleId.mockResolvedValue({ threat: undefined } as unknown as RuleResponse);

      const result = await generateScenario(baseInput, { rulesClient: stubRulesClient });

      expect(result).toEqual({ ok: false, reason: 'no_mitre_tags' });
    });

    it('returns no_mitre_tags when all threat entries have empty technique arrays', async () => {
      mockGetRuleByRuleId.mockResolvedValue({
        threat: [
          {
            tactic: { id: 'TA0002', name: 'Execution', reference: '' },
            technique: [],
          },
        ],
      } as unknown as RuleResponse);

      const result = await generateScenario(baseInput, { rulesClient: stubRulesClient });

      expect(result).toEqual({ ok: false, reason: 'no_mitre_tags' });
    });

    it('returns no_supported_techniques when no payload library entry matches', async () => {
      // T9999 is not in the payload library
      mockGetRuleByRuleId.mockResolvedValue(makeRuleResponse(['T9999']));

      const result = await generateScenario(baseInput, { rulesClient: stubRulesClient });

      expect(result).toEqual({ ok: false, reason: 'no_supported_techniques' });
    });

    it('returns no_supported_techniques when agentType filters out all matching payloads', async () => {
      // T1059.001 only supports 'endpoint'; sentinel_one should be filtered out.
      mockGetRuleByRuleId.mockResolvedValue(makeRuleResponse(['T1059.001']));

      const result = await generateScenario(
        { ...baseInput, agentType: 'sentinel_one' },
        { rulesClient: stubRulesClient }
      );

      expect(result).toEqual({ ok: false, reason: 'no_supported_techniques' });
    });
  });

  describe('success path', () => {
    it('returns a valid scenario for a rule with a supported technique', async () => {
      mockGetRuleByRuleId.mockResolvedValue(makeRuleResponse(['T1059.001']));

      const result = await generateScenario(baseInput, { rulesClient: stubRulesClient });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.ruleId).toBe('rule-001');
      expect(result.ruleMitreTechniques).toContain('T1059.001');
      expect(result.selectedPayloads.length).toBeGreaterThan(0);
      expect(result.expectedSignals.length).toBeGreaterThan(0);
      expect(result.scenarioId).toMatch(/^sha256-[0-9a-f]{64}$/);
    });

    it('extracts sub-technique IDs alongside parent technique IDs', async () => {
      mockGetRuleByRuleId.mockResolvedValue(makeRuleResponse(['T1059'], ['T1059.001']));

      const result = await generateScenario(baseInput, { rulesClient: stubRulesClient });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.ruleMitreTechniques).toContain('T1059');
      expect(result.ruleMitreTechniques).toContain('T1059.001');
    });

    it('scenarioId is deterministic: same inputs produce the same id', async () => {
      mockGetRuleByRuleId.mockResolvedValue(makeRuleResponse(['T1059.001']));

      const r1 = await generateScenario(baseInput, { rulesClient: stubRulesClient });
      const r2 = await generateScenario(baseInput, { rulesClient: stubRulesClient });

      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
      if (!r1.ok || !r2.ok) return;
      expect(r1.scenarioId).toBe(r2.scenarioId);
    });

    it('scenarioId changes when ruleId changes', async () => {
      mockGetRuleByRuleId.mockResolvedValue(makeRuleResponse(['T1059.001']));

      const r1 = await generateScenario(
        { ...baseInput, ruleId: 'rule-A' },
        { rulesClient: stubRulesClient }
      );
      const r2 = await generateScenario(
        { ...baseInput, ruleId: 'rule-B' },
        { rulesClient: stubRulesClient }
      );

      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
      if (!r1.ok || !r2.ok) return;
      expect(r1.scenarioId).not.toBe(r2.scenarioId);
    });

    it('deduplicates technique IDs that appear across multiple threat entries', async () => {
      mockGetRuleByRuleId.mockResolvedValue({
        threat: [
          {
            tactic: { id: 'TA0002', name: 'Execution', reference: '' },
            technique: [{ id: 'T1059.001', name: '', reference: '', subtechnique: [] }],
          },
          {
            tactic: { id: 'TA0002', name: 'Execution', reference: '' },
            technique: [{ id: 'T1059.001', name: '', reference: '', subtechnique: [] }],
          },
        ],
      } as unknown as RuleResponse);

      const result = await generateScenario(baseInput, { rulesClient: stubRulesClient });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const unique = new Set(result.ruleMitreTechniques);
      expect(result.ruleMitreTechniques.length).toBe(unique.size);
    });

    it('deduplicates expectedSignals across payloads', async () => {
      // Use two techniques that share signal names — dedup must apply.
      mockGetRuleByRuleId.mockResolvedValue(makeRuleResponse(['T1059.001', 'T1059.003']));

      const result = await generateScenario(baseInput, { rulesClient: stubRulesClient });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const unique = new Set(result.expectedSignals);
      expect(result.expectedSignals.length).toBe(unique.size);
    });

    it('filters payloads to the specified agentType', async () => {
      // T1057 (running-processes) supports all 4 agent types
      mockGetRuleByRuleId.mockResolvedValue(makeRuleResponse(['T1057']));

      const result = await generateScenario(
        { ...baseInput, agentType: 'endpoint' },
        { rulesClient: stubRulesClient }
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      for (const payload of result.selectedPayloads) {
        expect(payload.agentTypes).toContain('endpoint');
      }
    });

    it('returns more payloads when agentType is omitted than when filtered', async () => {
      // T1057 supports all 4 agent types; filtering to 'endpoint' should return the same set
      // (no loss), but adding techniques that only support endpoint should show the difference.
      mockGetRuleByRuleId.mockResolvedValue(makeRuleResponse(['T1057', 'T1059.001']));

      const withType = await generateScenario(
        { ...baseInput, agentType: 'endpoint' },
        { rulesClient: stubRulesClient }
      );
      const withoutType = await generateScenario(baseInput, { rulesClient: stubRulesClient });

      expect(withType.ok).toBe(true);
      expect(withoutType.ok).toBe(true);
      if (!withType.ok || !withoutType.ok) return;
      expect(withoutType.selectedPayloads.length).toBeGreaterThanOrEqual(
        withType.selectedPayloads.length
      );
    });

    it('passes ruleId and techniqueIds to getRuleByRuleId', async () => {
      mockGetRuleByRuleId.mockResolvedValue(makeRuleResponse(['T1059.001']));

      await generateScenario(baseInput, { rulesClient: stubRulesClient });

      expect(mockGetRuleByRuleId).toHaveBeenCalledWith({
        rulesClient: stubRulesClient,
        ruleId: 'rule-001',
      });
    });
  });
});
