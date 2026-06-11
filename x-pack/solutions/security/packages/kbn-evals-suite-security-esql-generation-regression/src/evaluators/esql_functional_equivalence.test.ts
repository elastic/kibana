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

    it('retries when the judge returns a response with no toolCalls (regression: TypeError on .function)', async () => {
      // Simulate the build 442041 failure mode: judge returns
      // empty/undefined `toolCalls` (e.g. bare-text refusal triggered
      // by a huge thinking-model prediction). Previously this threw
      // `TypeError: Cannot read properties of undefined (reading 'function')`
      // and took down the connector's whole test run. Now it should
      // throw a clean Error that p-retry can catch.
      mockExecuteUntilValid.mockResolvedValueOnce({
        toolCalls: [],
      } as unknown as Awaited<ReturnType<typeof executeUntilValid>>);
      mockJudgeResponse({
        equivalence: 'equivalent_with_caveats',
        reason: 'second attempt produced a structured judgement',
      });

      const log = makeLog();
      const evaluator = createCalibratedEsqlEquivalenceEvaluator({
        inferenceClient: {} as BoundInferenceClient,
        log,
        ...extractors,
      });

      const result = await evaluator.evaluate(
        params('FROM logs-* | LIMIT 1', 'FROM logs-* | LIMIT 1')
      );

      expect(result.score).toBe(0.5);
      expect(mockExecuteUntilValid).toHaveBeenCalledTimes(2);
      expect(log.warning).toHaveBeenCalled();
    });

    // pRetry uses exponential backoff (default ~1s + 2s + 4s + 8s = ~15s
    // for the worst case). The default jest timeout of 5s is too short.
    // Bump these specific tests' budgets.
    it('scores conservatively as not_equivalent when ALL retries return no toolCalls', async () => {
      // Same failure mode as above, but the judge never recovers across
      // pRetry's 4 attempts (1 + 3 retries). Instead of throwing and
      // killing the suite, we score 0 with `metadata.fallback =
      // 'judge_no_tool_call'` so the rest of the dataset still runs
      // and dashboards can filter these out of the FuncEq trendline.
      const emptyResponse = {
        toolCalls: [],
      } as unknown as Awaited<ReturnType<typeof executeUntilValid>>;
      mockExecuteUntilValid.mockResolvedValue(emptyResponse);

      const log = makeLog();
      const evaluator = createCalibratedEsqlEquivalenceEvaluator({
        inferenceClient: {} as BoundInferenceClient,
        log,
        ...extractors,
      });

      const result = await evaluator.evaluate(
        params(
          'FROM logs-* | EVAL huge = LENGTH("...thinking trace...") | LIMIT 1',
          'FROM logs-* | LIMIT 1'
        )
      );

      expect(result.score).toBe(0);
      expect(result.label).toBe('judge-no-tool-call');
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.equivalence).toBe('not_equivalent');
      expect(meta.equivalent).toBe(false);
      expect(meta.judgeVersion).toBe(ESQL_FUNCTIONAL_EQUIVALENCE_JUDGE_VERSION);
      expect(meta.fallback).toBe('judge_no_tool_call');
      expect(typeof meta.reason).toBe('string');
      expect(log.warning).toHaveBeenCalled();
      expect(log.error).toHaveBeenCalled();
    }, 30_000);

    it('scores conservatively as not_equivalent when toolCalls[0].function is missing', async () => {
      // Variant: toolCalls is non-empty but the first entry has no
      // .function. Same defensive path applies.
      const malformedResponse = {
        toolCalls: [{}],
      } as unknown as Awaited<ReturnType<typeof executeUntilValid>>;
      mockExecuteUntilValid.mockResolvedValue(malformedResponse);

      const log = makeLog();
      const evaluator = createCalibratedEsqlEquivalenceEvaluator({
        inferenceClient: {} as BoundInferenceClient,
        log,
        ...extractors,
      });

      const result = await evaluator.evaluate(
        params('FROM logs-* | LIMIT 1', 'FROM logs-* | LIMIT 1')
      );

      expect(result.score).toBe(0);
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.fallback).toBe('judge_no_tool_call');
    }, 30_000);
  });
});
