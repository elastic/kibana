/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators } from '@kbn/evals';
import { createRationaleQualityEvaluator } from './rationale_evaluator';
import { ALERT_ANALYSIS_EVAL_ALERTS } from './synthetic_alerts';

const CRITERIA = ['criterion one', 'criterion two'];

// The wrapper builds the inner criteria evaluator eagerly at construction, so
// `criteria` is called once no matter what; capture the inner evaluate to
// assert the judge itself never runs on a missing rationale.
const makeEvaluators = (score: number) => {
  const innerEvaluate = jest.fn().mockResolvedValue({ score });
  const evaluators = {
    criteria: jest.fn().mockReturnValue({ evaluate: innerEvaluate, name: 'criteria' }),
  } as unknown as DefaultEvaluators;
  return { evaluators, innerEvaluate };
};

const makeArgs = ({
  rationale,
  classification = 'true_positive',
}: {
  rationale?: string | null;
  classification?: string | null;
}) =>
  ({
    input: { alertId: 'a1' },
    output: {
      classification,
      confidenceScore: 0.9,
      rationale,
      executionId: 'exec-1',
      executionStatus: 'succeeded',
    },
    expected: { classification: 'true_positive' },
    metadata: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

describe('createRationaleQualityEvaluator', () => {
  it('scores N/A — not 0 — only when the verdict has neither classification nor rationale', async () => {
    // The evidenced 18-doc empty-artifact shape: the judge never sees it, so
    // absence cannot be graded as a grounding failure against the criteria.
    const { evaluators, innerEvaluate } = makeEvaluators(0);
    for (const rationale of [undefined, null, '']) {
      const result = await createRationaleQualityEvaluator(evaluators, CRITERIA).evaluate(
        makeArgs({ rationale, classification: null })
      );
      expect(result.score).toBeNull();
      expect(result.label).toBe('N/A');
      expect(innerEvaluate).not.toHaveBeenCalled();
    }
  });

  it('scores 0 — not N/A — when classification is present but the rationale is missing', async () => {
    // The rationale field is schema-required (alert_analysis_workflow.yaml), so
    // a classification without one is a schema violation, not a measurement
    // gap. N/A here would hide the violation from the report.
    const { evaluators, innerEvaluate } = makeEvaluators(1);
    for (const rationale of [undefined, null, '', '   ']) {
      const result = await createRationaleQualityEvaluator(evaluators, CRITERIA).evaluate(
        makeArgs({ rationale })
      );
      expect(result.score).not.toBeNull();
      expect(result.score).toBe(0);
      expect(innerEvaluate).not.toHaveBeenCalled();
    }
  });

  it('keeps the inner criteria evaluator name for baseline continuity', () => {
    // Pre-PR .evaluation-scores baselines and compare runs key on the
    // evaluator name; renaming 'criteria' would break comparability.
    const { evaluators } = makeEvaluators(0.75);
    const evaluator = createRationaleQualityEvaluator(evaluators, CRITERIA);
    expect(evaluator.name).toBe('criteria');
  });

  it('delegates to the criteria judge when a rationale exists', async () => {
    const { evaluators, innerEvaluate } = makeEvaluators(0.75);
    const result = await createRationaleQualityEvaluator(evaluators, CRITERIA).evaluate(
      makeArgs({ rationale: 'process name and command line indicate…' })
    );
    expect(result.score).toBe(0.75);
    expect(innerEvaluate).toHaveBeenCalledTimes(1);
  });

  it('gives the criteria judge the analysed alert document alongside the alertId', async () => {
    // Without the alert the judge only sees `{ alertId }` and fails the "does not invent alert
    // fields" criterion for every grounded rationale.
    const malicious = ALERT_ANALYSIS_EVAL_ALERTS.find(
      (alert) => alert.id === 'aa-eval-tier1-malicious-file'
    );
    const { evaluators, innerEvaluate } = makeEvaluators(1);
    const args = makeArgs({ rationale: 'update_flash.exe was dropped in Downloads' });
    args.output.alertData = malicious!.doc;

    await createRationaleQualityEvaluator(evaluators, CRITERIA).evaluate(args);

    const judged = innerEvaluate.mock.calls[0][0];
    expect(judged.input.alertId).toBe('a1');
    expect(judged.input.alertData['process.name']).toBe('update_flash.exe');
    expect(judged.input.alertData['file.path']).toContain('Downloads');
    expect(judged.output.alertData).toBeUndefined();
    expect(judged.output.rationale).toBe('update_flash.exe was dropped in Downloads');
  });

  it('keeps the fixture description consistent with the alert document paths', () => {
    const malicious = ALERT_ANALYSIS_EVAL_ALERTS.find(
      (alert) => alert.id === 'aa-eval-tier1-malicious-file'
    );
    expect(String(malicious!.doc['file.path'])).toContain('Downloads');
    expect(malicious!.description).toContain('Downloads');
    expect(malicious!.description).not.toContain('temp path');
  });
});
