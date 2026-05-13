/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ENDPOINT_FANOUT,
  ValidateRuleInputSchema,
} from '../../../../common/detection_emulation/schemas';
import { validateRuleSchema } from './validate_rule_input';

/**
 * Schema-drift round-trip suite (N2).
 *
 * The tool boundary schema (`validateRuleSchema`) carries `.describe()`
 * docstrings the LLM consumes; the route schema (`ValidateRuleInputSchema`)
 * carries the production input contract. They MUST stay in sync on field
 * names + accepted shapes — if they drift, the LLM happily emits a payload
 * the route then rejects with a 400, which is invisible to anyone reading
 * the LLM trace.
 *
 * For each fixture below we assert:
 *   1. Both schemas accept the input.
 *   2. The parsed result is structurally identical (deep-equal).
 *
 * If a future change adds a field to one schema but not the other, the
 * matching fixture will fail with a clear shape diff. Adding a new field
 * therefore requires extending BOTH schemas AND a fixture in this file —
 * which is the entire point.
 */
describe('validate_rule schemas — drift round-trip', () => {
  const fixtures: Array<{ name: string; input: Record<string, unknown> }> = [
    {
      name: 'minimal — required only',
      input: {
        ruleId: 'rule-abc-123',
        endpointIds: ['ws-001'],
      },
    },
    {
      name: 'log_injection mode (explicit)',
      input: {
        ruleId: 'rule-abc-123',
        endpointIds: ['ws-001'],
        mode: 'log_injection',
      },
    },
    {
      name: 'real_execution mode + endpoint agentType',
      input: {
        ruleId: 'rule-abc-123',
        endpointIds: ['ws-001', 'ws-002'],
        mode: 'real_execution',
        agentType: 'endpoint',
      },
    },
    {
      name: 'real_execution mode + non-endpoint agentType (sentinel_one)',
      input: {
        ruleId: 'rule-abc-123',
        endpointIds: ['ws-001'],
        mode: 'real_execution',
        agentType: 'sentinel_one',
      },
    },
    {
      name: 'wallBudgetMs only',
      input: {
        ruleId: 'rule-abc-123',
        endpointIds: ['ws-001'],
        wallBudgetMs: 60_000,
      },
    },
    {
      name: 'all optionals populated',
      input: {
        ruleId: 'rule-abc-123',
        endpointIds: ['ws-001', 'ws-002', 'ws-003'],
        mode: 'real_execution',
        agentType: 'crowdstrike',
        wallBudgetMs: 200_000,
      },
    },
  ];

  fixtures.forEach(({ name, input }) => {
    it(`accepts shape consistently across both schemas: ${name}`, () => {
      const routeResult = ValidateRuleInputSchema.safeParse(input);
      const toolResult = validateRuleSchema.safeParse(input);

      // Both must accept — otherwise drift between LLM contract and route
      // contract has been introduced.
      expect(routeResult.success).toBe(true);
      expect(toolResult.success).toBe(true);

      // Parsed shapes must match — tool schema cannot strip or transform
      // fields the route schema preserves (or vice versa).
      if (routeResult.success && toolResult.success) {
        expect(toolResult.data).toEqual(routeResult.data);
      }
    });
  });

  it('rejects the same invalid shape consistently across both schemas', () => {
    // Empty endpointIds: rejected by both (route uses `.min(1)`, tool too).
    // Verifies that *negative* shapes also stay aligned.
    const invalid = {
      ruleId: 'rule-abc-123',
      endpointIds: [],
    };

    expect(ValidateRuleInputSchema.safeParse(invalid).success).toBe(false);
    expect(validateRuleSchema.safeParse(invalid).success).toBe(false);
  });

  // ─── PROD-3: endpoint fanout cap drift ─────────────────────────────────────
  //
  // The cap MUST be applied identically to the tool and route schemas so the
  // LLM and the REST surface enforce the same limit. If a future PR loosens
  // one schema but not the other, the round-trip below catches it before it
  // ships.
  describe('PROD-3 endpoint fanout cap', () => {
    const generateAgentIds = (count: number): string[] =>
      Array.from({ length: count }, (_, i) => `ws-${i + 1}`);

    it('accepts exactly MAX_ENDPOINT_FANOUT endpointIds on BOTH schemas', () => {
      const input = {
        ruleId: 'rule-abc-123',
        endpointIds: generateAgentIds(MAX_ENDPOINT_FANOUT),
      };
      expect(ValidateRuleInputSchema.safeParse(input).success).toBe(true);
      expect(validateRuleSchema.safeParse(input).success).toBe(true);
    });

    it('rejects MAX_ENDPOINT_FANOUT + 1 endpointIds on BOTH schemas with the named error', () => {
      const input = {
        ruleId: 'rule-abc-123',
        endpointIds: generateAgentIds(MAX_ENDPOINT_FANOUT + 1),
      };

      const routeResult = ValidateRuleInputSchema.safeParse(input);
      const toolResult = validateRuleSchema.safeParse(input);

      expect(routeResult.success).toBe(false);
      expect(toolResult.success).toBe(false);

      if (!routeResult.success) {
        expect(routeResult.error.message).toContain('MAX_ENDPOINT_FANOUT');
      }
      if (!toolResult.success) {
        expect(toolResult.error.message).toContain('MAX_ENDPOINT_FANOUT');
      }
    });

    it('rejects empty endpointIds on BOTH schemas', () => {
      const input = {
        ruleId: 'rule-abc-123',
        endpointIds: [],
      };
      expect(ValidateRuleInputSchema.safeParse(input).success).toBe(false);
      expect(validateRuleSchema.safeParse(input).success).toBe(false);
    });
  });
});
