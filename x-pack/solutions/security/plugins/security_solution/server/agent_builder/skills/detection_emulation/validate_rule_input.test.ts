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
 * carries the production input contract. They MUST stay in sync on every
 * field name + shape THAT THE TOOL ALSO ACCEPTS — drift on a field both
 * schemas accept means the LLM happily emits a payload the route then
 * rejects with a 400, which is invisible to anyone reading the LLM trace.
 *
 * One DELIBERATE divergence exists: `agentType` is narrowed to
 * `'endpoint'` in the tool schema (and only the tool schema) so the LLM
 * cannot pick a dead-end agent type that the runner would reject
 * downstream. The route schema still accepts the broader enum for
 * non-LLM callers. The "tool narrowing" block below locks this
 * divergence in place.
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
      name: 'wallBudgetMs only',
      input: {
        ruleId: 'rule-abc-123',
        endpointIds: ['ws-001'],
        wallBudgetMs: 60_000,
      },
    },
    {
      name: 'all optionals populated (endpoint agentType)',
      input: {
        ruleId: 'rule-abc-123',
        endpointIds: ['ws-001', 'ws-002', 'ws-003'],
        mode: 'real_execution',
        agentType: 'endpoint',
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

      // Parsed shapes must match on the fields BOTH schemas observe.
      // The tool schema applies `.default('endpoint')` on `agentType`
      // (whereas the route schema makes it optional with no default),
      // so we strip `agentType` before deep-equality to avoid a false
      // positive when the input omits the field.
      if (routeResult.success && toolResult.success) {
        const { agentType: _routeAgentType, ...routeWithoutAgent } = routeResult.data;
        const { agentType: _toolAgentType, ...toolWithoutAgent } = toolResult.data;
        expect(toolWithoutAgent).toEqual(routeWithoutAgent);
      }
    });
  });

  // ─── DELIBERATE divergence: tool narrows agentType to 'endpoint' ─────────────
  //
  // The route schema still accepts the broader RESPONSE_ACTION_AGENT_TYPE
  // enum (for non-LLM callers, future external connectors, etc.). The tool
  // boundary intentionally narrows so the LLM cannot pick `sentinel_one`,
  // `crowdstrike`, or `microsoft_defender_endpoint` — none of which are
  // wired through the runner today, and surfacing them in the JSON Schema
  // gave the LLM real dead-end paths in eval traces.
  describe('tool narrowing: agentType', () => {
    (['sentinel_one', 'crowdstrike', 'microsoft_defender_endpoint'] as const).forEach(
      (agentType) => {
        it(`route accepts but tool rejects agentType=${agentType}`, () => {
          const input = {
            ruleId: 'rule-abc-123',
            endpointIds: ['ws-001'],
            mode: 'real_execution',
            agentType,
          };
          expect(ValidateRuleInputSchema.safeParse(input).success).toBe(true);
          expect(validateRuleSchema.safeParse(input).success).toBe(false);
        });
      }
    );

    it('tool defaults agentType to "endpoint" when omitted', () => {
      const input = { ruleId: 'rule-abc-123', endpointIds: ['ws-001'] };
      const result = validateRuleSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agentType).toBe('endpoint');
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
