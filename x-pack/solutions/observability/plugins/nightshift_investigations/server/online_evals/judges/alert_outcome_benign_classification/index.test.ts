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
import { MAX_JUDGE_INPUT_CHARS } from '../alert_outcome_shared';
import type { ReportHypothesis } from '../report';
import type { AlertOutcomeBenignClassificationOutput } from './prompt';
import { alertOutcomeBenignClassificationPrompt } from './prompt';
import { alertOutcomeBenignClassificationFixtures } from './fixtures';
import {
  alertOutcomeBenignClassificationJudge,
  isClassificationCorrect,
  isFalseDismissal,
  isFalseEscalation,
} from '.';

const BENIGN = 'Benign: a transient shared-Cassandra event self-resolved; no remediation needed.';
const ACTIONABLE =
  'Actionable: payments v3.2.1 leaked Postgres connections; mitigated by rollback.';
const REPORT = 'some report text';

const roundFor = (message: string): EvidenceRound => ({
  input: { message: 'Investigate the auction persistence alert' },
  steps: [],
  response: { message },
});

const judgeOutput = (
  overrides: Partial<AlertOutcomeBenignClassificationOutput> = {}
): AlertOutcomeBenignClassificationOutput => ({
  ground_truth_severity_determined: true,
  ground_truth_benign: true,
  report_claims_benign: true,
  report_escalates: false,
  reasoning: 'r',
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
  {
    outcome = BENIGN,
    report = REPORT,
    hypotheses,
  }: { outcome?: string; report?: string; hypotheses?: ReportHypothesis[] } = {}
) =>
  alertOutcomeBenignClassificationJudge.evaluate({
    round: roundFor(report),
    referenceData: { alert_outcome: outcome, hypotheses },
    inferenceClient,
    log: loggingSystemMock.createLogger(),
  });

const scoreMap = (scores: ReadonlyArray<{ name: string; score?: number | null }>) =>
  Object.fromEntries(scores.map(({ name, score }) => [name, score]));

describe('nightshift_alert_outcome_benign_classification', () => {
  it('sends the confirmed outcome and the report in one prompt', async () => {
    const { prompt, inferenceClient } = createInferenceClient(judgeOutput());

    await evaluate(inferenceClient);

    expect(prompt).toHaveBeenCalledTimes(1);
    const { input, toolChoice } = prompt.mock.calls[0][0];
    expect(toolChoice).toEqual({ function: 'score_alert_outcome_benign' });
    expect(input).toEqual({ confirmed_root_cause: BENIGN, investigation_report: REPORT });
  });

  it('grades the hypotheses panel as part of the report', async () => {
    const { prompt, inferenceClient } = createInferenceClient(judgeOutput());

    await evaluate(inferenceClient, {
      hypotheses: [{ candidate: 'Scheduled load test', status: 'confirmed', confidence: 0.8 }],
    });

    const { input } = prompt.mock.calls[0][0];
    expect(input.investigation_report).toBe(
      `${REPORT}\n\n## Hypotheses panel (shown to the user)\n- [confirmed] Scheduled load test (confidence 0.8)`
    );
  });

  describe.each(
    alertOutcomeBenignClassificationFixtures.map(
      (fixture) => [fixture.description, fixture] as const
    )
  )('fixture: %s', (_description, fixture) => {
    it('maps the judge output to the expected scores and labels', async () => {
      const { groundTruthBenign, reportClaimsBenign, reportEscalates } = fixture;
      const output = judgeOutput({
        ground_truth_benign: groundTruthBenign,
        report_claims_benign: reportClaimsBenign,
        report_escalates: reportEscalates,
        reasoning: fixture.description,
      });
      const { inferenceClient } = createInferenceClient(output);

      const { scores, notApplicable } = await evaluate(inferenceClient, {
        outcome: fixture.confirmedOutcome,
        report: fixture.investigationReport,
      });

      const { expectedCorrect, expectedFalseEscalation, expectedFalseDismissal } = fixture;
      expect(notApplicable).toBeUndefined();
      expect(scores).toEqual([
        {
          name: 'alert_outcome_benign_classification_correct',
          score: expectedCorrect ? 1 : 0,
          label: `gt_benign=${groundTruthBenign} report_benign=${reportClaimsBenign} report_escalates=${reportEscalates}`,
          explanation: fixture.description,
        },
        {
          name: 'alert_outcome_no_false_escalation',
          score: expectedFalseEscalation ? 0 : 1,
          label: `false_escalation=${expectedFalseEscalation}`,
          explanation: fixture.description,
        },
        {
          name: 'alert_outcome_no_false_dismissal',
          score: expectedFalseDismissal ? 0 : 1,
          label: `false_dismissal=${expectedFalseDismissal}`,
          explanation: fixture.description,
        },
      ]);
    });
  });

  it('scores a benign outcome reported as benign as all clean', async () => {
    const { inferenceClient } = createInferenceClient(judgeOutput());

    const { scores } = await evaluate(inferenceClient);

    expect(scoreMap(scores)).toEqual({
      alert_outcome_benign_classification_correct: 1,
      alert_outcome_no_false_escalation: 1,
      alert_outcome_no_false_dismissal: 1,
    });
  });

  it('flags a false escalation of a benign outcome', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({ report_claims_benign: false, report_escalates: true })
    );

    const { scores } = await evaluate(inferenceClient);

    expect(scoreMap(scores)).toEqual({
      alert_outcome_benign_classification_correct: 0,
      alert_outcome_no_false_escalation: 0,
      alert_outcome_no_false_dismissal: 1,
    });
  });

  it('flags a false dismissal of an actionable outcome', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({ ground_truth_benign: false, report_claims_benign: true })
    );

    const { scores } = await evaluate(inferenceClient, { outcome: ACTIONABLE });

    expect(scoreMap(scores)).toEqual({
      alert_outcome_benign_classification_correct: 0,
      alert_outcome_no_false_escalation: 1,
      alert_outcome_no_false_dismissal: 0,
    });
  });

  it('counts a symptom-only report on an actionable outcome as correct', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({
        ground_truth_benign: false,
        report_claims_benign: false,
        report_escalates: false,
      })
    );

    const { scores } = await evaluate(inferenceClient, { outcome: ACTIONABLE });

    expect(scoreMap(scores)).toEqual({
      alert_outcome_benign_classification_correct: 1,
      alert_outcome_no_false_escalation: 1,
      alert_outcome_no_false_dismissal: 1,
    });
  });

  it('counts a report that claims benign and escalates on a benign outcome as correct but a false escalation', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({ report_claims_benign: true, report_escalates: true })
    );

    const { scores } = await evaluate(inferenceClient);

    expect(scoreMap(scores)).toEqual({
      alert_outcome_benign_classification_correct: 1,
      alert_outcome_no_false_escalation: 0,
      alert_outcome_no_false_dismissal: 1,
    });
  });

  it('returns notApplicable without scores when the recovery states no severity', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({
        ground_truth_severity_determined: false,
        ground_truth_benign: false,
        report_claims_benign: false,
        report_escalates: false,
        reasoning: '',
      })
    );

    const result = await evaluate(inferenceClient, {
      outcome: 'The alert recovered; whether remediation was needed remains unknown.',
    });

    expect(result).toEqual({
      scores: [],
      notApplicable: { reason: 'recovery states no severity' },
    });
  });

  it('returns notApplicable without calling the LLM when the confirmed outcome is empty', async () => {
    const { prompt, inferenceClient } = createInferenceClient();

    const result = await evaluate(inferenceClient, { outcome: '  \n' });

    expect(prompt).not.toHaveBeenCalled();
    expect(result).toEqual({ scores: [], notApplicable: { reason: 'no confirmed outcome' } });
  });

  it('skips an empty report through the evidence schema, before evaluate runs', () => {
    const { evidenceSchema } = alertOutcomeBenignClassificationJudge;

    expect(evidenceSchema?.safeParse(roundFor('   ')).success).toBe(false);
    expect(evidenceSchema?.safeParse(roundFor(REPORT)).success).toBe(true);
  });

  it('truncates a long confirmed outcome and report before prompting', async () => {
    const { prompt, inferenceClient } = createInferenceClient(judgeOutput());

    await evaluate(inferenceClient, { outcome: 'c'.repeat(150_000), report: 'r'.repeat(150_000) });

    const { input } = prompt.mock.calls[0][0];
    const { confirmed_root_cause: outcome, investigation_report: report } = input;
    expect(outcome.startsWith('c'.repeat(MAX_JUDGE_INPUT_CHARS))).toBe(true);
    expect(outcome.endsWith('[truncated 60000 characters]')).toBe(true);
    expect(report.startsWith('r'.repeat(MAX_JUDGE_INPUT_CHARS))).toBe(true);
    expect(report.endsWith('[truncated 60000 characters]')).toBe(true);
    expect(alertOutcomeBenignClassificationPrompt.input.safeParse(input).success).toBe(true);
  });

  it('caps explanations', async () => {
    const { inferenceClient } = createInferenceClient(judgeOutput({ reasoning: 'z'.repeat(2000) }));

    const { scores } = await evaluate(inferenceClient);

    for (const { explanation } of scores) {
      expect(explanation).toHaveLength(MAX_EXPLANATION_LENGTH);
    }
  });

  it('throws without an inference client', async () => {
    await expect(
      alertOutcomeBenignClassificationJudge.evaluate({
        round: roundFor(REPORT),
        referenceData: { alert_outcome: BENIGN },
        log: loggingSystemMock.createLogger(),
      })
    ).rejects.toThrow(
      'Inference client is required for the nightshift_alert_outcome_benign_classification judge'
    );
  });
});

describe('isClassificationCorrect', () => {
  it('matches the report stance against the ground truth', () => {
    expect(
      isClassificationCorrect(
        judgeOutput({ ground_truth_benign: true, report_claims_benign: true })
      )
    ).toBe(true);
    expect(
      isClassificationCorrect(
        judgeOutput({ ground_truth_benign: false, report_claims_benign: false })
      )
    ).toBe(true);
    expect(
      isClassificationCorrect(
        judgeOutput({ ground_truth_benign: true, report_claims_benign: false })
      )
    ).toBe(false);
  });
});

describe('isFalseEscalation', () => {
  it('flags escalation only for a benign ground truth', () => {
    expect(
      isFalseEscalation(judgeOutput({ ground_truth_benign: true, report_escalates: true }))
    ).toBe(true);
    expect(
      isFalseEscalation(judgeOutput({ ground_truth_benign: false, report_escalates: true }))
    ).toBe(false);
  });
});

describe('isFalseDismissal', () => {
  it('flags dismissal only for an actionable ground truth', () => {
    expect(
      isFalseDismissal(judgeOutput({ ground_truth_benign: false, report_claims_benign: true }))
    ).toBe(true);
    expect(
      isFalseDismissal(judgeOutput({ ground_truth_benign: true, report_claims_benign: true }))
    ).toBe(false);
  });
});
