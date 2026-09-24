/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { payloadConformance, verdictAccuracy, VERDICT_QUALITY_CRITERIA } from './evaluators';

const params = (output: unknown, expected: unknown) =>
  ({ output, expected, input: {}, metadata: null } as Parameters<
    typeof verdictAccuracy.evaluate
  >[0]);

const meta = (result: { metadata?: Record<string, unknown> | undefined }) =>
  result.metadata as Record<string, unknown>;

describe('verdictAccuracy', () => {
  it('scores 1 when the predicted label matches the gold label', async () => {
    const result = await verdictAccuracy.evaluate(
      params(
        { verdict: { label: 'true_positive' }, executionStatus: 'completed' },
        { label: 'true_positive' }
      )
    );
    expect(result.score).toBe(1);
    expect(result.explanation).toContain('true_positive');
  });

  it('accepts the classification alias', async () => {
    const result = await verdictAccuracy.evaluate(
      params({ verdict: { classification: 'false_positive' } }, { label: 'false_positive' })
    );
    expect(result.score).toBe(1);
  });

  // REAL WORKFLOW SHAPE (smoke4, execution f9ab02c9): the graded output carries
  // the label as a plain string, e.g. `{"verdict": "true_positive", ...}`.
  it('accepts the real workflow shape: verdict as a plain string label', async () => {
    const result = await verdictAccuracy.evaluate(
      params({ verdict: 'true_positive', executionStatus: 'completed' }, { label: 'true_positive' })
    );
    expect(result.score).toBe(1);
    expect(result.label).toBe('true_positive');
  });

  // Graded verdict carries the full emit_result object (label via the `verdict`
  // alias, plus summary_markdown) — the graded shape after the PayloadConformance fix.
  it('accepts the graded emit_result object with the verdict alias', async () => {
    const result = await verdictAccuracy.evaluate(
      params(
        {
          verdict: { verdict: 'true_positive', summary_markdown: 's' },
          executionStatus: 'completed',
        },
        { label: 'true_positive' }
      )
    );
    expect(result.score).toBe(1);
    expect(result.label).toBe('true_positive');
  });

  it('scores 0 for a mismatched string verdict', async () => {
    const result = await verdictAccuracy.evaluate(
      params({ verdict: 'false_positive' }, { label: 'true_positive' })
    );
    expect(result.score).toBe(0);
  });

  it('scores 0 on a mismatched verdict', async () => {
    const result = await verdictAccuracy.evaluate(
      params({ verdict: { label: 'false_positive' } }, { label: 'true_positive' })
    );
    expect(result.score).toBe(0);
  });

  it('scores 0 (not throw) when the workflow produced no verdict', async () => {
    const result = await verdictAccuracy.evaluate(
      params({ verdict: undefined }, { label: 'true_positive' })
    );
    expect(result.score).toBe(0);
    expect(result.label).toBe('none');
  });
});

describe('payloadConformance', () => {
  const good = {
    verdict: {
      label: 'true_positive',
      summary_markdown: '## Summary\n\nC2 beacon to d15mawx0xveem1.cloudfront.net observed.',
    },
    executionStatus: 'completed',
  };

  // REAL WORKFLOW SHAPE: label as plain string on `verdict` (summary lives on
  // the workflow output object; when graded from the emit_result step, the
  // string label alone satisfies the label check — summary conformance applies
  // to the object form).
  it('scores 1 on a string label from the real workflow shape', async () => {
    const result = await payloadConformance.evaluate(
      params({ verdict: 'true_positive', executionStatus: 'completed' }, {})
    );
    expect(result.score).toBe(1);
  });

  // REAL EMIT_RESULT SHAPE (verified live, GET /api/workflows/executions/{id}):
  // the workflow.output step emits `{verdict: "true_positive", summary_markdown: ...}`,
  // and the graded output now carries that full object as `verdict` — label via
  // the `verdict` alias, summary graded directly.
  it('scores 1 on the full emit_result object (verdict alias + summary_markdown)', async () => {
    const result = await payloadConformance.evaluate(
      params(
        {
          verdict: {
            verdict: 'true_positive',
            summary_markdown: 'C2 beacon to 10.0.0.7 observed.',
          },
          executionStatus: 'completed',
        },
        {}
      )
    );
    expect(result.score).toBe(1);
    expect(meta(result).labelValid).toBe(true);
    expect(meta(result).summaryValid).toBe(true);
    expect(meta(result).summaryLength).toBe('C2 beacon to 10.0.0.7 observed.'.length);
  });

  it('scores 1 on an enum label plus present summary', async () => {
    expect((await payloadConformance.evaluate(params(good, {}))).score).toBe(1);
  });

  it('scores 0 when the label is outside the enum', async () => {
    const bad = { ...good, verdict: { ...good.verdict, label: 'benign' } };
    const result = await payloadConformance.evaluate(params(bad, {}));
    expect(result.score).toBe(0);
    expect(meta(result).labelValid).toBe(false);
  });

  it('scores 0 when summary_markdown is missing', async () => {
    const bad = { ...good, verdict: { label: 'true_positive' } };
    const result = await payloadConformance.evaluate(params(bad, {}));
    expect(result.score).toBe(0);
    expect(meta(result).summaryValid).toBe(false);
  });

  it('scores 0 when summary_markdown exceeds the length bound', async () => {
    const bad = {
      ...good,
      verdict: { ...good.verdict, summary_markdown: 'x'.repeat(9000) },
    };
    const result = await payloadConformance.evaluate(params(bad, {}));
    expect(result.score).toBe(0);
    expect(meta(result).summaryLength).toBe(9000);
  });

  it('honors a custom maxSummaryLength expectation', async () => {
    const bad = {
      ...good,
      verdict: { ...good.verdict, summary_markdown: 'x'.repeat(50) },
    };
    const result = await payloadConformance.evaluate(params(bad, { maxSummaryLength: 10 }));
    expect(result.score).toBe(0);
  });

  it('scores 0 when the verdict is absent entirely', async () => {
    const result = await payloadConformance.evaluate(params({ verdict: undefined }, {}));
    expect(result.score).toBe(0);
  });
});

describe('verdict quality criteria', () => {
  it('exposes the three LLM criteria strings for selectEvaluators wiring', () => {
    expect(VERDICT_QUALITY_CRITERIA).toHaveLength(3);
    expect(VERDICT_QUALITY_CRITERIA.every((c) => typeof c === 'string' && c.length > 20)).toBe(
      true
    );
    expect(VERDICT_QUALITY_CRITERIA.join(' ')).toMatch(/does not invent/);
  });
});
