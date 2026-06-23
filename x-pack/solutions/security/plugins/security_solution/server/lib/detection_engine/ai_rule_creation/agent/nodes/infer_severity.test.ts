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
  describe('risk_score range validation', () => {
    it.each([
      { severity: 'low', riskScore: 21, expected: 21 },
      { severity: 'low', riskScore: 0, expected: 0 },
      { severity: 'low', riskScore: 46, expected: 46 },
      { severity: 'medium', riskScore: 47, expected: 47 },
      { severity: 'medium', riskScore: 60, expected: 60 },
      { severity: 'medium', riskScore: 72, expected: 72 },
      { severity: 'high', riskScore: 73, expected: 73 },
      { severity: 'high', riskScore: 85, expected: 85 },
      { severity: 'high', riskScore: 98, expected: 98 },
      { severity: 'critical', riskScore: 99, expected: 99 },
      { severity: 'critical', riskScore: 100, expected: 100 },
    ])(
      'should keep risk_score $riskScore for $severity (within valid range)',
      async ({ severity, riskScore, expected }) => {
        const model = createMockModel({ severity, risk_score: riskScore });
        const node = inferSeverityNode({ model });

        const result = await node(baseState);

        expect(result.rule?.severity).toBe(severity);
        expect(result.rule?.risk_score).toBe(expected);
      }
    );

    it.each([
      { severity: 'low', riskScore: 47, expectedDefault: 21 },
      { severity: 'low', riskScore: 99, expectedDefault: 21 },
      { severity: 'medium', riskScore: 20, expectedDefault: 47 },
      { severity: 'medium', riskScore: 73, expectedDefault: 47 },
      { severity: 'high', riskScore: 50, expectedDefault: 73 },
      { severity: 'high', riskScore: 99, expectedDefault: 73 },
      { severity: 'critical', riskScore: 50, expectedDefault: 99 },
      { severity: 'critical', riskScore: 98, expectedDefault: 99 },
    ])(
      'should clamp to default $expectedDefault when $severity risk_score $riskScore is out of range',
      async ({ severity, riskScore, expectedDefault }) => {
        const model = createMockModel({ severity, risk_score: riskScore });
        const node = inferSeverityNode({ model });

        const result = await node(baseState);

        expect(result.rule?.severity).toBe(severity);
        expect(result.rule?.risk_score).toBe(expectedDefault);
      }
    );
  });

  describe('default risk_score per severity', () => {
    it.each([
      { severity: 'low', expectedDefault: 21 },
      { severity: 'medium', expectedDefault: 47 },
      { severity: 'high', expectedDefault: 73 },
      { severity: 'critical', expectedDefault: 99 },
    ])(
      'should use default $expectedDefault for $severity when risk_score is non-numeric',
      async ({ severity, expectedDefault }) => {
        const model = createMockModel({ severity, risk_score: 'invalid' });
        const events = createMockEvents();
        const node = inferSeverityNode({ model, events });

        const result = await node(baseState);

        expect(result.rule?.severity).toBe(severity);
        expect(result.rule?.risk_score).toBe(expectedDefault);
      }
    );
  });

  describe('case normalization', () => {
    it('should normalize uppercase severity to lowercase', async () => {
      const model = createMockModel({ severity: 'HIGH', risk_score: 85 });
      const node = inferSeverityNode({ model });

      const result = await node(baseState);

      expect(result.rule?.severity).toBe('high');
      expect(result.rule?.risk_score).toBe(85);
    });

    it('should normalize mixed-case severity', async () => {
      const model = createMockModel({ severity: 'Medium', risk_score: 60 });
      const node = inferSeverityNode({ model });

      const result = await node(baseState);

      expect(result.rule?.severity).toBe('medium');
      expect(result.rule?.risk_score).toBe(60);
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
