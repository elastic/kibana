/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvidenceRound } from '@kbn/evals-plugin/server';
import { SET_HYPOTHESES_TOOL_ID } from '@kbn/agentic-investigations-plugin/common';
import { MAX_EXPLANATION_LENGTH } from '../run_judge';
import { MAX_JUDGE_INPUT_CHARS } from '../alert_outcome_shared';
import type { AlertOutcomeRcaReportingGapOutput } from './prompt';
import { ALERT_OUTCOME_RCA_REPORTING_GAP_SYSTEM_PROMPT } from './prompt';
import { alertOutcomeRcaReportingGapFixtures } from './fixtures';
import { alertOutcomeRcaReportingGapJudge, isReportingGap } from '.';

const CAUSE = 'The payments v3.2.1 deploy leaked Postgres connections and exhausted the pool.';
const TRANSCRIPT = 'pg_stat_activity hit max_connections at 14:32; many idle-in-transaction.';
const REPORT = 'Checkout p99 latency exceeded the 2s threshold. Investigating further.';

const GRADE_SCORES: Readonly<Record<number, number>> = { 0: 0, 1: 0.333, 2: 0.667, 3: 1 };

const roundFor = (
  message: string,
  transcript: string | null = TRANSCRIPT,
  extraSteps: EvidenceRound['steps'] = []
): EvidenceRound => ({
  input: { message: 'Investigate the checkout latency alert' },
  steps: [
    ...(transcript === null ? [] : [{ tool_id: 'transcript', result: transcript }]),
    ...extraSteps,
  ],
  response: { message },
});

const judgeOutput = (
  overrides: Partial<AlertOutcomeRcaReportingGapOutput> = {}
): AlertOutcomeRcaReportingGapOutput => ({
  ground_truth_has_verified_cause: true,
  cause_in_transcript: 3,
  cause_in_report: 1,
  transcript_only_signals: '',
  reasoning: 'r',
  ...overrides,
});

const createInferenceClient = (...outputs: unknown[]) => {
  const chatComplete = jest.fn();
  for (const output of outputs) {
    chatComplete.mockResolvedValueOnce({ toolCalls: [{ function: { arguments: output } }] });
  }
  return { chatComplete, inferenceClient: { chatComplete } as unknown as BoundInferenceClient };
};

const evaluate = (
  inferenceClient: BoundInferenceClient,
  {
    cause = CAUSE,
    transcript = TRANSCRIPT,
    report = REPORT,
    extraSteps = [],
    closingReasoning,
  }: {
    cause?: string;
    transcript?: string | null;
    report?: string;
    extraSteps?: EvidenceRound['steps'];
    closingReasoning?: string;
  } = {}
) =>
  alertOutcomeRcaReportingGapJudge.evaluate({
    round: roundFor(report, transcript, extraSteps),
    referenceData: { alert_outcome: cause, closing_reasoning: closingReasoning },
    inferenceClient,
    log: loggingSystemMock.createLogger(),
  });

const scoreMap = (scores: ReadonlyArray<{ name: string; score?: number | null }>) =>
  Object.fromEntries(scores.map(({ name, score }) => [name, score]));

describe('nightshift_alert_outcome_rca_reporting_gap', () => {
  it('sends the transcript as a conversation without the final answer, then the cause and the report', async () => {
    const { chatComplete, inferenceClient } = createInferenceClient(judgeOutput());

    await evaluate(inferenceClient);

    expect(chatComplete).toHaveBeenCalledTimes(1);
    const { system, messages, tools, toolChoice } = chatComplete.mock.calls[0][0];
    expect(system).toBe(ALERT_OUTCOME_RCA_REPORTING_GAP_SYSTEM_PROMPT);
    expect(system).toContain('refer to hosts and people by their role');
    expect(tools).toHaveProperty('score_alert_outcome_reporting_gap');
    expect(toolChoice).toEqual({ function: 'score_alert_outcome_reporting_gap' });
    expect(messages.map(({ role }: { role: string }) => role)).toEqual([
      'user',
      'assistant',
      'tool',
      'user',
    ]);
    expect(messages[0].content).toBe('Investigate the checkout latency alert');
    expect(messages[2].response).toEqual({ result: TRANSCRIPT });
    const transcriptMessages = JSON.stringify(messages.slice(0, 3));
    expect(transcriptMessages).not.toContain(REPORT);
    const scoringRequest = messages[3].content;
    expect(scoringRequest).toContain(CAUSE);
    expect(scoringRequest).toContain(REPORT);
  });

  it("ends the transcript with the agent's closing notes, before the scoring request", async () => {
    const { chatComplete, inferenceClient } = createInferenceClient(judgeOutput());

    await evaluate(inferenceClient, {
      closingReasoning: 'The leaked connections exhaust the pool.',
    });

    const { messages } = chatComplete.mock.calls[0][0];
    expect(messages.slice(-2, -1)).toEqual([
      { role: 'assistant', content: 'The leaked connections exhaust the pool.' },
    ]);
  });

  describe.each(
    alertOutcomeRcaReportingGapFixtures.map((fixture) => [fixture.description, fixture] as const)
  )('fixture: %s', (_description, fixture) => {
    it('maps the judge output to the expected scores and labels', async () => {
      const { causeInTranscript, causeInReport, expectedGap } = fixture;
      const { chatComplete, inferenceClient } = createInferenceClient(
        judgeOutput({
          cause_in_transcript: causeInTranscript,
          cause_in_report: causeInReport,
          reasoning: fixture.description,
        })
      );

      const { scores, notApplicable } = await evaluate(inferenceClient, {
        cause: fixture.confirmedCause,
        transcript: fixture.transcript,
        report: fixture.investigationReport,
      });

      expect(JSON.stringify(chatComplete.mock.calls[0][0].messages)).toContain(
        JSON.stringify(fixture.transcript).slice(1, -1)
      );
      expect(notApplicable).toBeUndefined();
      expect(scores).toEqual([
        {
          name: 'alert_outcome_rca_found_in_transcript',
          score: GRADE_SCORES[causeInTranscript],
          label: `transcript=${causeInTranscript}/3 report=${causeInReport}/3`,
          explanation: fixture.description,
        },
        {
          name: 'alert_outcome_rca_no_reporting_gap',
          score: expectedGap ? 0 : 1,
          label: `gap=${expectedGap}`,
          explanation: 'none',
        },
      ]);
    });
  });

  it.each([
    [3, 1, 1, 0],
    [3, 3, 1, 1],
    [1, 1, 0.333, 1],
    [0, 3, 0, 1],
  ])(
    'maps transcript=%i report=%i to found=%d and no_gap=%d',
    async (causeInTranscript, causeInReport, found, noGap) => {
      const { inferenceClient } = createInferenceClient(
        judgeOutput({ cause_in_transcript: causeInTranscript, cause_in_report: causeInReport })
      );

      const { scores } = await evaluate(inferenceClient);

      expect(scoreMap(scores)).toEqual({
        alert_outcome_rca_found_in_transcript: found,
        alert_outcome_rca_no_reporting_gap: noGap,
      });
    }
  );

  it('explains the gap score with the transcript-only signals, or none when there are no gap', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({ transcript_only_signals: 'pool exhaustion at 14:32', reasoning: 'why' }),
      judgeOutput({ transcript_only_signals: '', reasoning: 'why' })
    );

    const { scores: withSignals } = await evaluate(inferenceClient);
    const { scores: withoutSignals } = await evaluate(inferenceClient);

    expect(withSignals[1].explanation).toBe('pool exhaustion at 14:32');
    expect(withoutSignals[1].explanation).toBe('none');
  });

  it('defaults missing transcript-only signals to none', async () => {
    const { transcript_only_signals: _omitted, ...output } = judgeOutput({ reasoning: 'why' });
    const { inferenceClient } = createInferenceClient(output);

    const { scores } = await evaluate(inferenceClient);

    expect(scores[0].explanation).toBe('why');
    expect(scores[1].explanation).toBe('none');
  });

  it('returns notApplicable without scores when the recovery states no verified cause', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({
        ground_truth_has_verified_cause: false,
        cause_in_transcript: 0,
        cause_in_report: 0,
        reasoning: '',
      })
    );

    const result = await evaluate(inferenceClient, {
      cause: 'The alert recovered; the root cause remains unknown.',
    });

    expect(result).toEqual({
      scores: [],
      notApplicable: { reason: 'recovery states no verified cause' },
    });
  });

  it.each([
    ['the confirmed cause is empty', { cause: '  \n' }, 'no confirmed cause'],
    ['the round has no tool calls', { transcript: null }, 'no investigation transcript'],
  ])('returns notApplicable without calling the LLM when %s', async (_case, options, reason) => {
    const { chatComplete, inferenceClient } = createInferenceClient();

    const result = await evaluate(inferenceClient, options);

    expect(chatComplete).not.toHaveBeenCalled();
    expect(result).toEqual({ scores: [], notApplicable: { reason } });
  });

  it('leaves out recorded conclusions and seeded workspace reads from the transcript', async () => {
    const { chatComplete, inferenceClient } = createInferenceClient(judgeOutput());

    await evaluate(inferenceClient, {
      extraSteps: [
        { tool_id: SET_HYPOTHESES_TOOL_ID, arguments: { hypotheses: ['RECORDED'] }, result: 'ok' },
        {
          tool_id: 'platform.core.sandbox_bash',
          arguments: { command: 'cat /workspace/wiki/services/payments.md' },
          result: 'SEEDED_WIKI_PAGE',
        },
      ],
    });

    const { messages } = chatComplete.mock.calls[0][0];
    expect(messages).toHaveLength(4);
    expect(JSON.stringify(messages)).not.toContain('RECORDED');
    expect(JSON.stringify(messages)).not.toContain('SEEDED_WIKI_PAGE');
  });

  it('returns notApplicable when only recorded conclusions are left', async () => {
    const { chatComplete, inferenceClient } = createInferenceClient();

    const result = await evaluate(inferenceClient, {
      transcript: null,
      extraSteps: [{ tool_id: SET_HYPOTHESES_TOOL_ID, arguments: {}, result: 'ok' }],
    });

    expect(chatComplete).not.toHaveBeenCalled();
    expect(result).toEqual({
      scores: [],
      notApplicable: { reason: 'no investigation transcript' },
    });
  });

  it('skips an empty report through the evidence schema, before evaluate runs', () => {
    const { evidenceSchema } = alertOutcomeRcaReportingGapJudge;

    expect(evidenceSchema?.safeParse(roundFor('   ')).success).toBe(false);
    expect(evidenceSchema?.safeParse(roundFor(REPORT)).success).toBe(true);
  });

  it('truncates a long confirmed cause and report before prompting', async () => {
    const { chatComplete, inferenceClient } = createInferenceClient(judgeOutput());

    await evaluate(inferenceClient, { cause: 'c'.repeat(150_000), report: 'r'.repeat(150_000) });

    const { messages } = chatComplete.mock.calls[0][0];
    const scoringRequest: string = messages[messages.length - 1].content;
    expect(scoringRequest).toContain(
      `${'c'.repeat(MAX_JUDGE_INPUT_CHARS)}\n[truncated 60000 characters]`
    );
    expect(scoringRequest).not.toContain('c'.repeat(MAX_JUDGE_INPUT_CHARS + 1));
    expect(scoringRequest).toContain(
      `${'r'.repeat(MAX_JUDGE_INPUT_CHARS)}\n[truncated 60000 characters]`
    );
    expect(scoringRequest).not.toContain('r'.repeat(MAX_JUDGE_INPUT_CHARS + 1));
  });

  it('caps explanations', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({ reasoning: 'z'.repeat(2000), transcript_only_signals: 'z'.repeat(2000) })
    );

    const { scores } = await evaluate(inferenceClient);

    for (const { explanation } of scores) {
      expect(explanation).toHaveLength(MAX_EXPLANATION_LENGTH);
    }
  });

  it('throws without an inference client', async () => {
    await expect(
      alertOutcomeRcaReportingGapJudge.evaluate({
        round: roundFor(REPORT),
        referenceData: { alert_outcome: CAUSE },
        log: loggingSystemMock.createLogger(),
      })
    ).rejects.toThrow(
      'Inference client is required for the nightshift_alert_outcome_rca_reporting_gap judge'
    );
  });
});

describe('isReportingGap', () => {
  it.each([
    [3, 1, true],
    [2, 0, true],
    [3, 3, false],
    [3, 2, false],
    [1, 1, false],
    [0, 0, false],
    [0, 3, false],
  ])('transcript=%i report=%i is a gap: %s', (causeInTranscript, causeInReport, expected) => {
    expect(
      isReportingGap({ cause_in_transcript: causeInTranscript, cause_in_report: causeInReport })
    ).toBe(expected);
  });
});
