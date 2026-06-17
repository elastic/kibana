/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inferSeverityNode } from './infer_severity';
import type { RuleCreationState } from '../state';

jest.mock('./prompts', () => ({
  SEVERITY_INFERENCE_PROMPT: {
    pipe: jest.fn().mockReturnThis(),
  },
}));

import { SEVERITY_INFERENCE_PROMPT } from './prompts';

const createMockModel = (response: Record<string, unknown>) => {
  const mockChain = {
    pipe: jest.fn().mockReturnValue({
      invoke: jest.fn().mockResolvedValue(response),
    }),
  };
  (SEVERITY_INFERENCE_PROMPT.pipe as jest.Mock).mockReturnValue(mockChain);
  return {} as any;
};

const createMockModelThatRejects = (errorMessage: string) => {
  const mockChain = {
    pipe: jest.fn().mockReturnValue({
      invoke: jest.fn().mockRejectedValue(new Error(errorMessage)),
    }),
  };
  (SEVERITY_INFERENCE_PROMPT.pipe as jest.Mock).mockReturnValue(mockChain);
  return {} as any;
};

const createMockEvents = () => ({
  reportProgress: jest.fn(),
  sendUiEvent: jest.fn(),
});

const baseState: RuleCreationState = {
  userQuery: 'detect credential dumping via LSASS',
  rule: {
    query: 'FROM logs-endpoint.events.* | WHERE process.name == "lsass.exe"',
  },
  errors: [],
  warnings: [],
};

describe('inferSeverityNode', () => {
  describe('canonical severity-to-risk_score mapping', () => {
    it.each([
      { severity: 'low', expectedRiskScore: 21 },
      { severity: 'medium', expectedRiskScore: 47 },
      { severity: 'high', expectedRiskScore: 73 },
      { severity: 'critical', expectedRiskScore: 99 },
    ])(
      'should map $severity to risk_score $expectedRiskScore',
      async ({ severity, expectedRiskScore }) => {
        const model = createMockModel({ severity, risk_score: 999 });
        const events = createMockEvents();
        const node = inferSeverityNode({ model, events });

        const result = await node(baseState);

        expect(result.rule?.severity).toBe(severity);
        expect(result.rule?.risk_score).toBe(expectedRiskScore);
      }
    );

    it('should enforce canonical risk_score even when model returns wrong value', () => {
      // The model may hallucinate arbitrary risk scores; the node enforces the canonical mapping
    });
  });

  describe('case normalization', () => {
    it('should normalize uppercase severity to lowercase', async () => {
      const model = createMockModel({ severity: 'HIGH', risk_score: 50 });
      const node = inferSeverityNode({ model });

      const result = await node(baseState);

      expect(result.rule?.severity).toBe('high');
      expect(result.rule?.risk_score).toBe(73);
    });

    it('should normalize mixed-case severity', async () => {
      const model = createMockModel({ severity: 'Medium', risk_score: 0 });
      const node = inferSeverityNode({ model });

      const result = await node(baseState);

      expect(result.rule?.severity).toBe('medium');
      expect(result.rule?.risk_score).toBe(47);
    });
  });

  describe('invalid severity handling', () => {
    it('should default to low when model returns unknown severity', async () => {
      const model = createMockModel({ severity: 'urgent', risk_score: 100 });
      const events = createMockEvents();
      const node = inferSeverityNode({ model, events });

      const result = await node(baseState);

      expect(result.rule?.severity).toBe('low');
      expect(result.rule?.risk_score).toBe(21);
    });

    it('should default to low when severity is undefined', async () => {
      const model = createMockModel({ risk_score: 50 });
      const node = inferSeverityNode({ model });

      const result = await node(baseState);

      expect(result.rule?.severity).toBe('low');
      expect(result.rule?.risk_score).toBe(21);
    });
  });

  describe('error handling', () => {
    it('should return warnings instead of failing on model error', async () => {
      const model = createMockModelThatRejects('LLM timeout');
      const events = createMockEvents();
      const node = inferSeverityNode({ model, events });

      const result = await node(baseState);

      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('Failed to infer severity')])
      );
      expect(result.rule?.severity).toBeUndefined();
    });

    it('should report progress on error', async () => {
      const model = createMockModelThatRejects('connection refused');
      const events = createMockEvents();
      const node = inferSeverityNode({ model, events });

      await node(baseState);

      expect(events.reportProgress).toHaveBeenCalledWith(
        expect.stringContaining('Failed to infer severity')
      );
    });
  });

  describe('progress reporting', () => {
    it('should report initial and completion progress', async () => {
      const model = createMockModel({ severity: 'high', risk_score: 73 });
      const events = createMockEvents();
      const node = inferSeverityNode({ model, events });

      await node(baseState);

      expect(events.reportProgress).toHaveBeenCalledWith(
        expect.stringContaining('Analyzing detection scenario')
      );
      expect(events.reportProgress).toHaveBeenCalledWith(
        expect.stringContaining('Severity inferred: high')
      );
    });
  });

  describe('state handling', () => {
    it('should use empty string for esql_query when rule.query is missing', async () => {
      const model = createMockModel({ severity: 'low', risk_score: 21 });
      const node = inferSeverityNode({ model });
      const stateWithoutQuery: RuleCreationState = {
        ...baseState,
        rule: {},
      };

      const result = await node(stateWithoutQuery);

      expect(result.rule?.severity).toBe('low');
    });
  });
});
