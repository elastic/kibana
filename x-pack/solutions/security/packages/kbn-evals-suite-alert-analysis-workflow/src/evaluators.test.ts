/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classificationAccuracy, validVerdict } from './evaluators';

describe('classificationAccuracy', () => {
  it('scores 1 when the predicted classification matches the golden label', async () => {
    const result = await classificationAccuracy.evaluate({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output: { classification: 'true_positive', confidenceScore: 0.9 } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expected: { classification: 'true_positive' } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(result.score).toBe(1);
  });

  it('scores 0 when the prediction is wrong — an empty verdict is not that case', async () => {
    const result = await classificationAccuracy.evaluate({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output: { classification: 'false_positive', confidenceScore: 0.9 } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expected: { classification: 'true_positive' } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(result.score).toBe(0);
  });

  it('scores N/A — not 0 — when the verdict artifact is empty `{}`', async () => {
    // A run that never produced a verdict is a missing measurement; counting it
    // as a wrong classification drags the accuracy mean toward 0 for nothing.
    const result = await classificationAccuracy.evaluate({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expected: { classification: 'true_positive' } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('scores N/A when the output is null/undefined', async () => {
    for (const output of [null, undefined]) {
      const result = await classificationAccuracy.evaluate({
        output,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expected: { classification: 'true_positive' } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      expect(result.score).toBeNull();
      expect(result.label).toBe('N/A');
    }
  });
});

describe('validVerdict', () => {
  it('scores 1 for a well-formed verdict', async () => {
    const result = await validVerdict.evaluate({
      output: {
        classification: 'true_positive',
        confidenceScore: 0.5,
        rationale: 'process name and signer match the expected pattern',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(result.score).toBe(1);
  });

  it('scores 0 when the schema-required rationale is missing or blank', async () => {
    // alert_analysis_workflow.yaml requires a rationale; a verdict without one
    // is schema drift, not a measurement gap, and must not pass the guardrail.
    for (const rationale of [undefined, null, '', '   ']) {
      const result = await validVerdict.evaluate({
        output: {
          classification: 'true_positive',
          confidenceScore: 0.5,
          rationale,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      expect(result.score).toBe(0);
      expect(result.metadata?.rationaleValid).toBe(false);
    }
  });

  it('scores 0 for schema drift (classification outside the enum)', async () => {
    const result = await validVerdict.evaluate({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output: { classification: 'banana', confidenceScore: 0.5 } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(result.score).toBe(0);
  });

  it('scores N/A — not 0 — when the verdict artifact is empty', async () => {
    // An absent verdict is a failed execution, not schema drift: the guardrail
    // must distinguish "output malformed" from "no output at all".
    const result = await validVerdict.evaluate({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });
});
