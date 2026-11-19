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
import { recoveryEvidenceFamiliesJudge } from './evidence_families';
import { recoveryRootCauseEvidenceJudge } from './root_cause_evidence';
import { CAUSAL_STRATEGY_IDS } from './strategies';
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
  evidence: EvidenceRound = round
) => judge.evaluate({ round: evidence, inferenceClient, log: loggingSystemMock.createLogger() });

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
    expect(scores).toHaveLength(1);
    expect(scores[0]).toMatchObject({
      name: 'recovery_checklist',
      score: 1.5 / CAUSAL_STRATEGY_IDS.length,
      label: '1 ran / 1 blocked / 15 not run',
    });
    expect(scores[0].explanation).toContain('Not run: rule_definition');
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

describe('nightshift_recovery_evidence_families', () => {
  it('reads the families from tool-call arguments and tags each one', async () => {
    const { scores } = await evaluate(recoveryEvidenceFamiliesJudge);

    expect(scores).toEqual([
      expect.objectContaining({
        name: 'recovery_evidence_families',
        score: 2 / 9,
        label: '2/9 families',
        metadata: { tags: ['family:alert_documents', 'family:rule_event_log'] },
      }),
    ]);
  });

  it('does not apply to a round without tool calls', async () => {
    const { scores, notApplicable } = await evaluate(recoveryEvidenceFamiliesJudge, undefined, {
      ...round,
      steps: [],
    });

    expect(scores).toEqual([]);
    expect(notApplicable).toEqual({ reason: 'the round made no tool calls' });
  });
});
