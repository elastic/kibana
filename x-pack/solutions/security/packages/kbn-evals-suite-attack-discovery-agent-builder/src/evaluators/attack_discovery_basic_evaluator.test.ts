/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttackDiscoveryBasicEvaluator } from './attack_discovery_basic_evaluator';
import type {
  AttackDiscovery,
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

interface Params {
  input: AttackDiscoveryAgentBuilderExample['input'];
  output: AttackDiscoveryAgentBuilderTaskOutput;
  expected: AttackDiscoveryAgentBuilderExample['output'];
  metadata: AttackDiscoveryAgentBuilderExample['metadata'];
}

const validInsight: AttackDiscovery = {
  title: 'Credential access on finance-ws-01',
  summaryMarkdown: 'LSASS access following encoded PowerShell.',
  detailsMarkdown: 'rundll32 accessed lsass.exe after an encoded PowerShell execution.',
  alertIds: ['alert-1', 'alert-2'],
};

const baseOutput = (
  insights: AttackDiscovery[] | null | undefined
): AttackDiscoveryAgentBuilderTaskOutput => ({
  messages: [],
  steps: [],
  errors: [],
  insights,
  workflow: {
    stages: [],
    retrievedAlertCount: null,
    passedAlertCount: null,
    validatedDiscoveryCount: null,
  },
});

const expectedFor = (expectedToolPath: string[]): AttackDiscoveryAgentBuilderExample['output'] => ({
  expectedToolPath,
  expectedWorkflowStages: [],
  expectedRetrievedAlertCount: null,
  expectedPassedAlertCount: null,
});

const params = ({
  insights,
  expected,
}: {
  insights: AttackDiscovery[] | null | undefined;
  expected: AttackDiscoveryAgentBuilderExample['output'];
}): Params => ({
  input: {} as Params['input'],
  output: baseOutput(insights),
  expected,
  metadata: {} as Params['metadata'],
});

describe('createAttackDiscoveryBasicEvaluator', () => {
  const evaluator = createAttackDiscoveryBasicEvaluator();

  describe('examples that are expected to run the AD tool', () => {
    const applicable = expectedFor(['security.attack-discovery.run']);

    it('scores 1 for well-formed insights', async () => {
      const result = await evaluator.evaluate(
        params({ insights: [validInsight], expected: applicable })
      );

      expect(result.score).toBe(1);
      expect(result.label).toBe('ok');
    });

    // Guards against the N/A branch becoming a blanket exemption: an applicable
    // example that returned no insights is a genuine failure and must still
    // score 0.
    it('scores 0 when insights are missing', async () => {
      const result = await evaluator.evaluate(params({ insights: null, expected: applicable }));

      expect(result.score).toBe(0);
      expect(result.label).toBe('missing_insights');
    });

    it('scores 0 when an insight is malformed', async () => {
      const result = await evaluator.evaluate(
        params({ insights: [{ ...validInsight, title: '' }], expected: applicable })
      );

      expect(result.score).toBe(0);
      expect(result.label).toBe('invalid_shape');
    });
  });

  describe('examples that never produce insights by design', () => {
    // `missing-alert-retrieval` — the agent is expected to stop after ES|QL.
    it('returns N/A for an expected path that stops before the AD tool', async () => {
      const result = await evaluator.evaluate(
        params({
          insights: null,
          expected: expectedFor([
            'security.attack-discovery.get_default_esql_query',
            'platform.core.execute_esql',
          ]),
        })
      );

      expect(result.score).toBeNull();
      expect(result.label).toBe('N/A');
    });

    // `status-only` — the agent only reads execution status.
    it('returns N/A for a status-only expected path', async () => {
      const result = await evaluator.evaluate(
        params({ insights: null, expected: expectedFor(['security.attack-discovery.get_status']) })
      );

      expect(result.score).toBeNull();
      expect(result.label).toBe('N/A');
    });

    it('returns N/A when no expected tool path is annotated', async () => {
      const result = await evaluator.evaluate(
        params({ insights: null, expected: expectedFor([]) })
      );

      expect(result.score).toBeNull();
      expect(result.label).toBe('N/A');
    });
  });
});
