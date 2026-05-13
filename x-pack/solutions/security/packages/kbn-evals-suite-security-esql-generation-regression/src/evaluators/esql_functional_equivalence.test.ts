/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { executeUntilValid } from '@kbn/inference-prompt-utils';
import {
  ESQL_FUNCTIONAL_EQUIVALENCE_EVALUATOR_NAME,
  ESQL_FUNCTIONAL_EQUIVALENCE_JUDGE_VERSION,
  createCalibratedEsqlEquivalenceEvaluator,
} from './esql_functional_equivalence';

jest.mock('@kbn/inference-prompt-utils', () => ({
  executeUntilValid: jest.fn(),
}));

const mockExecuteUntilValid = executeUntilValid as jest.MockedFunction<typeof executeUntilValid>;

const makeLog = (): ToolingLog =>
  ({
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } as unknown as ToolingLog);

const params = (output: string, expected: string) => ({
  input: {},
  output,
  expected,
  metadata: null,
});

const extractors = {
  predictionExtractor: (o: unknown) => o as string,
  groundTruthExtractor: (e: unknown) => e as string,
};

/**
 * Build a fake `executeUntilValid` response that emits the judge's
 * canonical tool-call shape (`toolCalls[0].function.arguments`).
 */
function mockJudgeResponse(args: {
  equivalence: 'equivalent' | 'equivalent_with_caveats' | 'not_equivalent';
  reason: string;
}) {
  mockExecuteUntilValid.mockResolvedValueOnce({
    toolCalls: [
      {
        function: {
          name: 'evaluate',
          arguments: args,
        },
      },
    ],
  } as unknown as Awaited<ReturnType<typeof executeUntilValid>>);
}

describe('createCalibratedEsqlEquivalenceEvaluator', () => {
  beforeEach(() => {
    mockExecuteUntilValid.mockReset();
  });

  describe('evaluator metadata', () => {
    it('uses the framework-compatible evaluator name and LLM kind', () => {
      const evaluator = createCalibratedEsqlEquivalenceEvaluator({
        inferenceClient: {} as BoundInferenceClient,
        log: makeLog(),
        ...extractors,
      });
      expect(evaluator.name).toBe(ESQL_FUNCTIONAL_EQUIVALENCE_EVALUATOR_NAME);
      expect(evaluator.name).toBe('ES|QL Functional Equivalence');
      expect(evaluator.kind).toBe('LLM');
    });
  });

  describe('three-point scoring', () => {
    it('maps "equivalent" to score 1.0 with the equivalent label', async () => {
      mockJudgeResponse({
        equivalence: 'equivalent',
        reason: 'Same intent, same aggregation, only the alias differs.',
      });

      const evaluator = createCalibratedEsqlEquivalenceEvaluator({
        inferenceClient: {} as BoundInferenceClient,
        log: makeLog(),
        ...extractors,
      });

      const result = await evaluator.evaluate(
        params('FROM logs-* | STATS total = COUNT(*)', 'FROM logs-* | STATS count = COUNT(*)')
      );

      expect(result.score).toBe(1);
      expect(result.label).toBe('Equivalent ES|QL query');
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.equivalence).toBe('equivalent');
      expect(meta.equivalent).toBe(true);
      expect(meta.judgeVersion).toBe(ESQL_FUNCTIONAL_EQUIVALENCE_JUDGE_VERSION);
    });

    it('maps "equivalent_with_caveats" to score 0.5 with a partial-credit label', async () => {
      mockJudgeResponse({
        equivalence: 'equivalent_with_caveats',
        reason: 'Same intent but candidate uses host.hostname instead of host.name.',
      });

      const evaluator = createCalibratedEsqlEquivalenceEvaluator({
        inferenceClient: {} as BoundInferenceClient,
        log: makeLog(),
        ...extractors,
      });

      const result = await evaluator.evaluate(
        params('FROM logs-* | STATS BY host.hostname', 'FROM logs-* | STATS BY host.name')
      );

      expect(result.score).toBe(0.5);
      expect(result.label).toBe('Equivalent with caveats');
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.equivalence).toBe('equivalent_with_caveats');
      // `equivalent` flag is reserved for the strict pass for back-compat
      // with the framework evaluator's score doc shape.
      expect(meta.equivalent).toBe(false);
    });

    it('maps "not_equivalent" to score 0.0 with a non-equivalent label', async () => {
      mockJudgeResponse({
        equivalence: 'not_equivalent',
        reason: 'Wrong aggregation: gold uses AVG, candidate uses MAX.',
      });

      const evaluator = createCalibratedEsqlEquivalenceEvaluator({
        inferenceClient: {} as BoundInferenceClient,
        log: makeLog(),
        ...extractors,
      });

      const result = await evaluator.evaluate(
        params('FROM logs-* | STATS MAX(x)', 'FROM logs-* | STATS AVG(x)')
      );

      expect(result.score).toBe(0);
      expect(result.label).toBe('Non-equivalent ES|QL query');
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.equivalence).toBe('not_equivalent');
      expect(meta.equivalent).toBe(false);
    });
  });

  describe('missing inputs', () => {
    it('short-circuits to score 0 when the prediction is empty (no LLM call)', async () => {
      const evaluator = createCalibratedEsqlEquivalenceEvaluator({
        inferenceClient: {} as BoundInferenceClient,
        log: makeLog(),
        ...extractors,
      });

      const result = await evaluator.evaluate(params('', 'FROM logs-* | LIMIT 1'));

      expect(result.score).toBe(0);
      expect(result.label).toBe('No');
      expect(result.explanation).toBe('Missing prediction or ground truth query');
      expect(mockExecuteUntilValid).not.toHaveBeenCalled();
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.judgeVersion).toBe(ESQL_FUNCTIONAL_EQUIVALENCE_JUDGE_VERSION);
    });

    it('short-circuits to score 0 when the gold is empty (no LLM call)', async () => {
      const evaluator = createCalibratedEsqlEquivalenceEvaluator({
        inferenceClient: {} as BoundInferenceClient,
        log: makeLog(),
        ...extractors,
      });

      const result = await evaluator.evaluate(params('FROM logs-* | LIMIT 1', ''));

      expect(result.score).toBe(0);
      expect(result.label).toBe('No');
      expect(mockExecuteUntilValid).not.toHaveBeenCalled();
    });
  });

  describe('reason surfacing', () => {
    it('surfaces the judge reason as the explanation field', async () => {
      const reason =
        'Candidate is broader: missing the event.action == "failure" filter, so it counts all events instead of just failures.';
      mockJudgeResponse({ equivalence: 'not_equivalent', reason });

      const evaluator = createCalibratedEsqlEquivalenceEvaluator({
        inferenceClient: {} as BoundInferenceClient,
        log: makeLog(),
        ...extractors,
      });

      const result = await evaluator.evaluate(
        params(
          'FROM logs-* | STATS COUNT(*)',
          'FROM logs-* | WHERE event.action == "failure" | STATS COUNT(*)'
        )
      );

      expect(result.explanation).toBe(reason);
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.reason).toBe(reason);
    });
  });

  describe('judge contract violations', () => {
    it('retries via p-retry when the judge emits an out-of-enum equivalence value', async () => {
      // First two attempts return invalid shape; third succeeds.
      mockExecuteUntilValid.mockRejectedValueOnce(new Error('malformed'));
      mockExecuteUntilValid.mockRejectedValueOnce(new Error('malformed'));
      mockJudgeResponse({ equivalence: 'equivalent', reason: 'aligned on third try' });

      const log = makeLog();
      const evaluator = createCalibratedEsqlEquivalenceEvaluator({
        inferenceClient: {} as BoundInferenceClient,
        log,
        ...extractors,
      });

      const result = await evaluator.evaluate(
        params('FROM logs-* | LIMIT 1', 'FROM logs-* | LIMIT 1')
      );

      expect(result.score).toBe(1);
      expect(mockExecuteUntilValid).toHaveBeenCalledTimes(3);
      expect(log.warning).toHaveBeenCalled();
    });
  });
});
