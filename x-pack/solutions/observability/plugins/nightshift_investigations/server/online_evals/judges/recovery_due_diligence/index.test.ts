/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvidenceRound } from '@kbn/evals-plugin/server';
import { recoveryCausalChecklistJudge } from './causal_checklist';
import { recoveryReferenceDataSchema, renderEarlierRounds } from './reference_data';
import { recoveryEvidenceFamiliesJudge } from './evidence_families';
import { recoveryRootCauseEvidenceJudge } from './root_cause_evidence';
import { CAUSAL_STRATEGY_IDS, applyCitationRule } from './strategies';
import { TAG_PATTERN } from '../../score_tags';

const round: EvidenceRound = {
  input: { message: 'An alert in this investigation has recovered.' },
  steps: [
    {
      tool_call_id: 'c1',
      tool_id: 'nightshift_sandbox_bash',
      arguments: { command: 'curl "$URL/.alerts-*/_search"' },
      result: [{ type: 'other', data: { stdout: '{"hits":{"total":{"value":1}}}' } }],
    },
    {
      tool_call_id: 'c2',
      tool_id: 'nightshift_sandbox_bash',
      arguments: { command: 'curl "$URL/.kibana-event-log-*/_search"' },
      result: [{ type: 'error', data: { message: 'unauthorized' } }],
    },
  ],
  response: { message: 'The alert closed after a restart; the failure itself never stopped.' },
};

const createInferenceClient = (output: unknown) => {
  const prompt = jest.fn().mockResolvedValue({ toolCalls: [{ function: { arguments: output } }] });
  return { prompt, inferenceClient: { prompt } as unknown as BoundInferenceClient };
};

const evaluate = (
  judge: typeof recoveryCausalChecklistJudge,
  inferenceClient?: BoundInferenceClient,
  evidence: EvidenceRound = round,
  referenceData?: Record<string, unknown>
) =>
  judge.evaluate({
    round: evidence,
    referenceData,
    inferenceClient,
    log: loggingSystemMock.createLogger(),
  });

describe('recoveryReferenceDataSchema', () => {
  it('accepts a recovery that sends no reference data, which has no earlier round to pass', () => {
    expect(recoveryReferenceDataSchema.safeParse(undefined).success).toBe(true);
    expect(
      recoveryReferenceDataSchema.safeParse({ earlier_rounds: [{ answer: 'a', tool_calls: [] }] })
        .success
    ).toBe(true);
  });
});

describe('applyCitationRule', () => {
  const ran = (id: string, step: number) => ({ id, status: 'ran' as const, step, note: '' });

  it('gives credit only to a tool-based strategy that cites a call the round made', () => {
    const { statuses, uncited } = applyCitationRule(
      [ran('alert_record', 2), ran('rule_execution_trace', 0), ran('refire_check', 9)],
      2
    );

    expect(statuses.alert_record).toBe('ran');
    expect(statuses.rule_execution_trace).toBe('not_run');
    expect(statuses.refire_check).toBe('not_run');
    expect(uncited).toEqual(['rule_execution_trace', 'refire_check']);
  });

  it('needs no citation for a strategy judged from the answer, which cannot be blocked', () => {
    const { statuses } = applyCitationRule(
      [ran('hypothesis_revision', 0), { id: 'gaps_named', status: 'blocked', step: 0, note: '' }],
      0
    );

    expect(statuses.hypothesis_revision).toBe('ran');
    expect(statuses.gaps_named).toBe('not_run');
  });
});

describe('nightshift_recovery_causal_checklist', () => {
  it('scores ran strategies as 1 and blocked ones as half, and counts a strategy the judge left out as not run', async () => {
    const { prompt, inferenceClient } = createInferenceClient({
      strategies: [
        { id: 'alert_record', status: 'ran', step: 1, note: 'read it' },
        { id: 'rule_execution_trace', status: 'blocked', step: 2, note: 'denied' },
      ],
      summary: 'Read the alert, could not read the event log.',
    });

    const { scores } = await evaluate(recoveryCausalChecklistJudge, inferenceClient);

    expect(prompt.mock.calls[0][0].toolChoice).toEqual({ function: 'score_recovery_checklist' });
    expect(prompt.mock.calls[0][0].input.transcript).toContain('## Tool call 2');
    expect(prompt.mock.calls[0][0].input.strategy_list).toContain('- alert_record:');
    expect(scores).toHaveLength(1);
    expect(scores[0]).toMatchObject({
      name: 'recovery_checklist',
      score: 1.5 / CAUSAL_STRATEGY_IDS.length,
      label: '1 ran / 1 blocked / 15 not run',
    });
    expect(scores[0].explanation).toContain('Not run: rule_definition');
  });

  it('does not count a strategy without a cited tool call, and says so', async () => {
    const { inferenceClient } = createInferenceClient({
      strategies: [
        { id: 'alert_record', status: 'ran', step: 1, note: '' },
        { id: 'rule_execution_trace', status: 'ran', step: 0, note: 'made up' },
      ],
      summary: 'Summary.',
    });

    const { scores } = await evaluate(recoveryCausalChecklistJudge, inferenceClient);

    expect(scores[0].label).toBe('1 ran / 0 blocked / 16 not run');
    expect(scores[0].explanation).toContain(
      'Claimed without a cited tool call: rule_execution_trace'
    );
    expect(scores[0].metadata?.tags).toContain('strategy:rule_execution_trace:not_run');
  });

  it('passes the earlier rounds answers to the judge, and keeps the citation out of the tags', async () => {
    const { prompt, inferenceClient } = createInferenceClient({
      strategies: [{ id: 'alert_record', status: 'ran', step: 1, note: 'customer-specific text' }],
      summary: 'Summary with customer-specific text.',
    });

    const { scores } = await evaluate(recoveryCausalChecklistJudge, inferenceClient, round, {
      earlier_rounds: [{ answer: 'Hypothesis A: a bad deploy.', tool_calls: [] }],
    });

    expect(prompt.mock.calls[0][0].input.earlier_answers).toContain('Hypothesis A: a bad deploy.');
    expect(scores[0].metadata?.strategies).toContainEqual({
      id: 'alert_record',
      status: 'ran',
      step: 1,
    });
    expect(JSON.stringify(scores[0].metadata)).not.toContain('customer');
  });

  it('tags every strategy with its status, from the fixed vocabulary only', async () => {
    const { inferenceClient } = createInferenceClient({
      strategies: [{ id: 'alert_record', status: 'ran', step: 1, note: 'customer-specific text' }],
      summary: 'Summary with customer-specific text.',
    });

    const { scores } = await evaluate(recoveryCausalChecklistJudge, inferenceClient);
    const tags = scores[0].metadata?.tags as string[];

    expect(tags).toHaveLength(CAUSAL_STRATEGY_IDS.length);
    expect(tags).toContain('strategy:alert_record:ran');
    expect(tags).toContain('strategy:refire_check:not_run');
    expect(tags.every((tag) => TAG_PATTERN.test(tag))).toBe(true);
    expect(JSON.stringify(tags)).not.toContain('customer');
  });

  it('requires an inference client', async () => {
    await expect(evaluate(recoveryCausalChecklistJudge)).rejects.toThrow(
      'Inference client is required'
    );
  });
});

describe('nightshift_recovery_root_cause_evidence', () => {
  it('scores the mechanism, the closure and unsupported claims as separate tagged scores', async () => {
    const { prompt, inferenceClient } = createInferenceClient({
      mechanism_claim: 'a service account lacks read access',
      mechanism_evidenced: 1,
      closure_claim: 'none',
      closure_evidenced: 0.4,
      unsupported_claim: true,
      reasoning: 'The closure is a guess.',
    });

    const { scores } = await evaluate(recoveryRootCauseEvidenceJudge, inferenceClient);

    expect(prompt.mock.calls[0][0].toolChoice).toEqual({
      function: 'score_recovery_root_cause_evidence',
    });
    expect(scores).toEqual([
      expect.objectContaining({
        name: 'recovery_mechanism_evidenced',
        score: 1,
        label: 'evidenced',
        metadata: { tags: ['mechanism:evidenced'] },
      }),
      // 0.4 is snapped to the nearest half step by the output schema.
      expect.objectContaining({
        name: 'recovery_closure_evidenced',
        score: 0.5,
        label: 'partial',
        metadata: { tags: ['closure:partial'] },
      }),
      expect.objectContaining({
        name: 'recovery_no_unsupported_claim',
        score: 0,
        label: 'unsupported_claim=true',
        metadata: { tags: ['unsupported_claim:true'] },
      }),
    ]);
  });
});

describe('root-cause evidence judge with earlier rounds', () => {
  it("shows the judge the earlier rounds' tool calls and answers, so what they found counts as supported", async () => {
    const { prompt, inferenceClient } = createInferenceClient({
      mechanism_claim: 'none',
      mechanism_evidenced: 0,
      closure_claim: 'none',
      closure_evidenced: 0,
      unsupported_claim: false,
      reasoning: 'ok',
    });

    await evaluate(recoveryRootCauseEvidenceJudge, inferenceClient, round, {
      earlier_rounds: [
        {
          answer: 'The earlier answer.',
          tool_calls: [
            {
              tool_id: 'nightshift_sandbox_bash',
              arguments: { command: 'curl rails' },
              result: 'Rails log lines from 11-11 06:50Z',
            },
          ],
        },
      ],
    });

    const { earlier_context: earlierContext } = prompt.mock.calls[0][0].input;
    expect(earlierContext).toContain('Rails log lines from 11-11 06:50Z');
    expect(earlierContext).toContain('The earlier answer.');
  });
});

describe('renderEarlierRounds', () => {
  it('says so when there is no earlier round', () => {
    expect(renderEarlierRounds(undefined)).toBe('(not available)');
  });

  it('cuts long results and drops the middle calls when they do not fit', () => {
    const toolCalls = Array.from({ length: 200 }, (_, index) => ({
      tool_id: 'tool',
      arguments: {},
      result: `${index}`.padEnd(3_000, 'x'),
    }));

    const rendered = renderEarlierRounds([{ answer: 'a', tool_calls: toolCalls }]);

    expect(rendered).toContain('tool calls omitted here');
    expect(rendered.length).toBeLessThan(80_000);
  });
});

describe('nightshift_recovery_evidence_families', () => {
  it('scores the families the judge says were queried, each with a cited call, and tags them', async () => {
    const { prompt, inferenceClient } = createInferenceClient({
      families: [
        { id: 'alert_documents', queried: true, step: 1 },
        { id: 'rule_event_log', queried: true, step: 2 },
        // A claim without a call the round made does not count.
        { id: 'apm_metrics', queried: true, step: 0 },
        { id: 'source_code', queried: false, step: 0 },
      ],
    });

    const { scores } = await evaluate(recoveryEvidenceFamiliesJudge, inferenceClient);

    expect(prompt.mock.calls[0][0].toolChoice).toEqual({
      function: 'score_recovery_evidence_families',
    });
    expect(prompt.mock.calls[0][0].input.family_list).toContain('- alert_documents:');
    expect(scores).toEqual([
      expect.objectContaining({
        name: 'recovery_evidence_families',
        score: 2 / 9,
        label: '2/9 families',
        metadata: { tags: ['family:alert_documents', 'family:rule_event_log'] },
      }),
    ]);
  });

  it('scores a round with no tool calls 0 instead of skipping it, without a model call', async () => {
    const { prompt, inferenceClient } = createInferenceClient({ families: [] });

    const { scores, notApplicable } = await evaluate(
      recoveryEvidenceFamiliesJudge,
      inferenceClient,
      { ...round, steps: [] }
    );

    expect(prompt).not.toHaveBeenCalled();
    expect(notApplicable).toBeUndefined();
    expect(scores).toEqual([
      expect.objectContaining({ score: 0, label: '0/9 families', metadata: { tags: [] } }),
    ]);
  });
});
