/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvidenceRound } from '@kbn/evals-plugin/server';
import { MAX_EXPLANATION_LENGTH } from '../run_judge';
import type { AlertOutcomeRcaAccuracyOutput } from './prompt';
import { MAX_JUDGE_INPUT_CHARS, alertOutcomeRcaAccuracyPrompt } from './prompt';
import { alertOutcomeRcaFixtures } from './fixtures';
import { alertOutcomeRcaAccuracyJudge, applyPenalty } from '.';

const CAUSE = 'productCatalogService OOM after the v3.2.1 deploy caused checkout 5xx';
const REPORT =
  "The v3.2.1 deploy of productCatalogService OOM'd, spiking checkout 5xx (metric http_5xx).";

const roundFor = (message: string): EvidenceRound => ({
  input: { message: 'Investigate the checkout 5xx alert' },
  steps: [],
  response: { message },
});

const judgeOutput = (
  overrides: Partial<AlertOutcomeRcaAccuracyOutput> = {}
): AlertOutcomeRcaAccuracyOutput => ({
  ground_truth_has_verified_cause: true,
  root_cause_match: true,
  mechanism_match: true,
  evidence_match: true,
  score: 3,
  materially_wrong_claim: false,
  offending_claim: '',
  reasoning: 'reason',
  ...overrides,
});

const createInferenceClient = (...outputs: unknown[]) => {
  const prompt = jest.fn();
  for (const output of outputs) {
    prompt.mockResolvedValueOnce({ toolCalls: [{ function: { arguments: output } }] });
  }
  return { prompt, inferenceClient: { prompt } as unknown as BoundInferenceClient };
};

const evaluate = (
  inferenceClient: BoundInferenceClient,
  { cause = CAUSE, report = REPORT }: { cause?: string; report?: string } = {}
) =>
  alertOutcomeRcaAccuracyJudge.evaluate({
    round: roundFor(report),
    referenceData: { alert_outcome: cause },
    inferenceClient,
    log: loggingSystemMock.createLogger(),
  });

const scoreMap = (scores: ReadonlyArray<{ name: string; score?: number | null }>) =>
  Object.fromEntries(scores.map(({ name, score }) => [name, score]));

describe('nightshift_alert_outcome_rca_accuracy', () => {
  it('sends the confirmed cause and the report in one prompt', async () => {
    const { prompt, inferenceClient } = createInferenceClient(judgeOutput());

    await evaluate(inferenceClient);

    expect(prompt).toHaveBeenCalledTimes(1);
    const { input, toolChoice } = prompt.mock.calls[0][0];
    expect(toolChoice).toEqual({ function: 'score_alert_outcome_rca' });
    expect(input).toEqual({ confirmed_root_cause: CAUSE, investigation_report: REPORT });
  });

  describe.each(alertOutcomeRcaFixtures.map((fixture) => [fixture.description, fixture] as const))(
    'fixture: %s',
    (_description, fixture) => {
      it('maps the judge output to the expected scores and labels', async () => {
        const { inferenceClient } = createInferenceClient(
          judgeOutput({
            root_cause_match: fixture.expectedRootCauseMatch,
            mechanism_match: fixture.expectedMechanismMatch,
            evidence_match: fixture.expectedEvidenceMatch,
            score: fixture.judgeScore,
            materially_wrong_claim: fixture.expectedMateriallyWrongClaim,
            offending_claim: fixture.offendingClaim,
            reasoning: fixture.description,
          })
        );

        const { scores, notApplicable } = await evaluate(inferenceClient, {
          cause: fixture.confirmedRootCause,
          report: fixture.investigationReport,
        });

        const { expectedScore, expectedMateriallyWrongClaim, offendingClaim } = fixture;
        expect(notApplicable).toBeUndefined();
        expect(scores).toEqual([
          {
            name: 'alert_outcome_rca_depth',
            score: Math.round((expectedScore / 3) * 1000) / 1000,
            label: `score=${expectedScore}/3`,
            explanation: fixture.description,
          },
          {
            name: 'alert_outcome_rca_accuracy',
            score: expectedScore === 3 ? 1 : 0,
            label: `score=${expectedScore}/3`,
            explanation: fixture.description,
          },
          {
            name: 'alert_outcome_rca_no_hallucination',
            score: expectedMateriallyWrongClaim ? 0 : 1,
            label: `hallucinated=${expectedMateriallyWrongClaim}`,
            explanation: offendingClaim || 'none',
          },
        ]);
      });
    }
  );

  it('gives depth but not accuracy for partial progress', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({ score: 2, evidence_match: false })
    );

    const { scores } = await evaluate(inferenceClient);

    expect(scoreMap(scores)).toMatchObject({
      alert_outcome_rca_depth: 0.667,
      alert_outcome_rca_accuracy: 0,
    });
  });

  it('flows the hallucination penalty into every score', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({
        materially_wrong_claim: true,
        offending_claim: 'invented an unrelated DB outage',
      })
    );

    const { scores } = await evaluate(inferenceClient);

    expect(scoreMap(scores)).toEqual({
      alert_outcome_rca_depth: 0.667,
      alert_outcome_rca_accuracy: 0,
      alert_outcome_rca_no_hallucination: 0,
    });
  });

  it('ignores a wrong-claim flag that names no claim', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({ materially_wrong_claim: true, offending_claim: '' })
    );

    const { scores } = await evaluate(inferenceClient);

    expect(scoreMap(scores)).toEqual({
      alert_outcome_rca_depth: 1,
      alert_outcome_rca_accuracy: 1,
      alert_outcome_rca_no_hallucination: 1,
    });
  });

  it('returns notApplicable without scores when the recovery states no verified cause', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({
        ground_truth_has_verified_cause: false,
        root_cause_match: false,
        mechanism_match: false,
        evidence_match: false,
        score: 0,
        reasoning: '',
      })
    );

    const result = await evaluate(inferenceClient, {
      cause: 'The alert recovered; the root cause remains unresolved.',
    });

    expect(result).toEqual({
      scores: [],
      notApplicable: { reason: 'recovery states no verified cause' },
    });
  });

  it('returns notApplicable without calling the LLM when the confirmed cause is empty', async () => {
    const { prompt, inferenceClient } = createInferenceClient();

    const result = await evaluate(inferenceClient, { cause: '  \n' });

    expect(prompt).not.toHaveBeenCalled();
    expect(result).toEqual({ scores: [], notApplicable: { reason: 'no confirmed cause' } });
  });

  it('skips an empty report through the evidence schema, before evaluate runs', () => {
    const { evidenceSchema } = alertOutcomeRcaAccuracyJudge;

    expect(evidenceSchema?.safeParse(roundFor('   ')).success).toBe(false);
    expect(evidenceSchema?.safeParse(roundFor(REPORT)).success).toBe(true);
  });

  it('accepts a confirmed cause of any length in the reference data schema', () => {
    const { referenceDataSchema } = alertOutcomeRcaAccuracyJudge;

    expect(referenceDataSchema?.safeParse({ alert_outcome: 'x'.repeat(150_000) }).success).toBe(
      true
    );
  });

  it('truncates a long confirmed cause and report before prompting', async () => {
    const { prompt, inferenceClient } = createInferenceClient(judgeOutput());

    await evaluate(inferenceClient, { cause: 'c'.repeat(150_000), report: 'r'.repeat(150_000) });

    const { input } = prompt.mock.calls[0][0];
    const { confirmed_root_cause: cause, investigation_report: report } = input;
    expect(cause.startsWith('c'.repeat(MAX_JUDGE_INPUT_CHARS))).toBe(true);
    expect(cause.endsWith('[truncated 60000 characters]')).toBe(true);
    expect(report.startsWith('r'.repeat(MAX_JUDGE_INPUT_CHARS))).toBe(true);
    expect(report.endsWith('[truncated 60000 characters]')).toBe(true);
    expect(alertOutcomeRcaAccuracyPrompt.input.safeParse(input).success).toBe(true);
  });

  it('caps explanations', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({
        materially_wrong_claim: true,
        offending_claim: 'y'.repeat(2000),
        reasoning: 'z'.repeat(2000),
      })
    );

    const { scores } = await evaluate(inferenceClient);

    for (const { explanation } of scores) {
      expect(explanation).toHaveLength(MAX_EXPLANATION_LENGTH);
    }
  });

  it('throws without an inference client', async () => {
    await expect(
      alertOutcomeRcaAccuracyJudge.evaluate({
        round: roundFor(REPORT),
        referenceData: { alert_outcome: CAUSE },
        log: loggingSystemMock.createLogger(),
      })
    ).rejects.toThrow(
      'Inference client is required for the nightshift_alert_outcome_rca_accuracy judge'
    );
  });
});

describe('applyPenalty', () => {
  it('lowers the score by one when a wrong claim is named', () => {
    expect(
      applyPenalty(
        judgeOutput({ materially_wrong_claim: true, offending_claim: 'invented a Redis outage' })
      )
    ).toBe(2);
  });

  it('does not penalize a wrong-claim flag without a named claim', () => {
    expect(
      applyPenalty(judgeOutput({ score: 2, materially_wrong_claim: true, offending_claim: '' }))
    ).toBe(2);
  });

  it('floors the score at 0', () => {
    expect(
      applyPenalty(
        judgeOutput({
          score: 0,
          root_cause_match: false,
          mechanism_match: false,
          evidence_match: false,
          materially_wrong_claim: true,
          offending_claim: 'fabricated cause',
        })
      )
    ).toBe(0);
  });

  it('lowers a 3 to 2 when a sub-check is false', () => {
    expect(applyPenalty(judgeOutput({ evidence_match: false }))).toBe(2);
  });
});
