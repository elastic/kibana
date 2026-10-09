/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAdToolResultEvaluator } from './ad_tool_result_evaluator';
import type {
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

interface Params {
  input: AttackDiscoveryAgentBuilderExample['input'];
  output: AttackDiscoveryAgentBuilderTaskOutput;
  expected: AttackDiscoveryAgentBuilderExample['output'];
  metadata: AttackDiscoveryAgentBuilderExample['metadata'];
}

const baseOutput = (
  overrides: Partial<AttackDiscoveryAgentBuilderTaskOutput> = {}
): AttackDiscoveryAgentBuilderTaskOutput => ({
  messages: [],
  steps: [],
  errors: [],
  workflow: {
    stages: [],
    retrievedAlertCount: null,
    passedAlertCount: null,
    validatedDiscoveryCount: null,
  },
  ...overrides,
});

const expectedFor = (expectedToolPath: string[]): AttackDiscoveryAgentBuilderExample['output'] => ({
  expectedToolPath,
  expectedWorkflowStages: [],
  expectedRetrievedAlertCount: null,
  expectedPassedAlertCount: null,
});

const params = ({
  output,
  expected,
}: {
  output: AttackDiscoveryAgentBuilderTaskOutput;
  expected: AttackDiscoveryAgentBuilderExample['output'];
}): Params => ({
  input: {} as Params['input'],
  output,
  expected,
  metadata: {} as Params['metadata'],
});

describe('createAdToolResultEvaluator', () => {
  const evaluator = createAdToolResultEvaluator();

  describe('examples that are expected to run the AD tool', () => {
    const applicable = expectedFor(['security.attack-discovery.run']);

    it('scores 1 when the tool completed with discoveries', async () => {
      const result = await evaluator.evaluate(
        params({
          output: baseOutput({ adToolResult: { status: 'completed', discoveryCount: 2 } }),
          expected: applicable,
        })
      );

      expect(result.score).toBe(1);
    });

    // Guards against the N/A branch becoming a blanket exemption: an applicable
    // example that produced no AD result at all is a genuine failure and must
    // still score 0.
    it('scores 0 when the AD tool never ran', async () => {
      const result = await evaluator.evaluate(
        params({ output: baseOutput(), expected: applicable })
      );

      expect(result.score).toBe(0);
      expect(result.label).not.toBe('N/A');
    });

    it('scores 0 when the tool errored', async () => {
      const result = await evaluator.evaluate(
        params({
          output: baseOutput({ adToolResult: { status: 'error', discoveryCount: null } }),
          expected: applicable,
        })
      );

      expect(result.score).toBe(0);
    });

    it('scores 0 when the tool completed with zero discoveries', async () => {
      const result = await evaluator.evaluate(
        params({
          output: baseOutput({ adToolResult: { status: 'completed', discoveryCount: 0 } }),
          expected: applicable,
        })
      );

      expect(result.score).toBe(0);
    });
  });

  describe('examples that never run the AD tool by design', () => {
    // `missing-alert-retrieval` — the agent is expected to stop after ES|QL.
    it('returns N/A for an expected path that stops before the AD tool', async () => {
      const result = await evaluator.evaluate(
        params({
          output: baseOutput(),
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
        params({
          output: baseOutput(),
          expected: expectedFor(['security.attack-discovery.get_status']),
        })
      );

      expect(result.score).toBeNull();
      expect(result.label).toBe('N/A');
    });

    it('returns N/A when no expected tool path is annotated', async () => {
      const result = await evaluator.evaluate(
        params({ output: baseOutput(), expected: expectedFor([]) })
      );

      expect(result.score).toBeNull();
      expect(result.label).toBe('N/A');
    });
  });
});
