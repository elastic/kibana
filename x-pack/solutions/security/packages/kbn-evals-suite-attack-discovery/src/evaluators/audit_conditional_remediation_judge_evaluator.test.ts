/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeUntilValid } from '@kbn/inference-prompt-utils';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { AUDIT_SCENARIOS } from '../audit_failure_classes/registry';
import { createAuditConditionalRemediationJudgeEvaluator } from './audit_conditional_remediation_judge_evaluator';
import {
  emptyInput,
  makeDiscovery,
  makeGold,
  makeOutput,
  resolveReferenceFromMetadata,
} from './audit_test_utils';

jest.mock('@kbn/inference-prompt-utils', () => ({ executeUntilValid: jest.fn() }));

const executeMock = executeUntilValid as jest.MockedFunction<typeof executeUntilValid>;

interface Verdict {
  index: number;
  verdict: 'unconditional' | 'conditional' | 'no_containment';
  quote: string;
  explanation: string;
}

const verdict = (
  index: number,
  kind: Verdict['verdict'],
  quote = '',
  explanation = 'because'
): Verdict => ({ index, verdict: kind, quote, explanation });

const respondWith = (discoveries: Verdict[]) =>
  executeMock.mockResolvedValue({
    toolCalls: [{ function: { name: 'grade', arguments: { discoveries } } }],
  } as never);

const gold = makeGold({
  alertGroups: { chain: ['c1', 'c2'], other: ['o1'] },
  confirmedGroups: ['chain'],
});

const log = { error: jest.fn() } as unknown as ToolingLog;
const evaluator = createAuditConditionalRemediationJudgeEvaluator({
  inferenceClient: {} as BoundInferenceClient,
  log,
  resolveReference: resolveReferenceFromMetadata,
});

const run = (
  discoveries: Array<Parameters<typeof makeDiscovery>[0]>,
  evaluatorUnderTest = evaluator,
  metadata: unknown = { gold }
) =>
  evaluatorUnderTest.evaluate({
    input: emptyInput,
    output: makeOutput(discoveries.map((overrides) => makeDiscovery(overrides))),
    expected: undefined,
    metadata,
  } as never);

const lastInput = (): Array<{ index: number; title: string; markdown: string }> =>
  JSON.parse((executeMock.mock.calls[0][0].input as { discoveries: string }).discoveries);

describe('ConditionalRemediationJudge evaluator', () => {
  beforeEach(() => {
    executeMock.mockReset();
    jest.mocked(log.error).mockClear();
  });

  it('is configured as a maximizing LLM evaluator', () => {
    expect(evaluator).toMatchObject({
      name: 'ConditionalRemediationJudge',
      kind: 'LLM',
      direction: 'maximize',
    });
  });

  describe('not applicable', () => {
    it('with no discoveries, without calling the judge', async () => {
      expect(await run([])).toMatchObject({ score: null, label: 'N/A' });
      expect(executeMock).not.toHaveBeenCalled();
    });

    it('when every discovery cites only confirmed-malicious alerts', async () => {
      expect(await run([{ alertIds: ['c1', 'c2'], detailsMarkdown: 'Revoke it.' }])).toMatchObject({
        score: null,
        label: 'N/A',
      });
      expect(executeMock).not.toHaveBeenCalled();
    });

    it('when the example names no known scenario', async () => {
      expect(await run([{ alertIds: ['o1'] }], evaluator, { scenarioId: 'nope' })).toMatchObject({
        score: null,
        label: 'N/A',
      });
      expect(executeMock).not.toHaveBeenCalled();
    });
  });

  it('passes a task error through as a null score without calling the judge', async () => {
    const result = await evaluator.evaluate({
      input: emptyInput,
      output: { insights: null, errors: ['connector exploded'] },
      expected: undefined,
      metadata: { gold },
    } as never);
    expect(result).toMatchObject({
      score: null,
      label: 'task_error',
      explanation: 'connector exploded',
    });
    expect(executeMock).not.toHaveBeenCalled();
  });

  describe('scoring', () => {
    it('scores 1 when every discovery is conditional or has no containment', async () => {
      respondWith([
        verdict(0, 'conditional', 'If the owner denies it, revoke the key.'),
        verdict(1, 'no_containment'),
      ]);
      const result = await run([
        { alertIds: ['o1'], detailsMarkdown: 'If the owner denies it, revoke the key.' },
        { alertIds: ['o1'], detailsMarkdown: 'A login occurred.' },
      ]);
      expect(result).toMatchObject({ score: 1, label: 'conditional_or_none' });
      expect(executeMock).toHaveBeenCalledTimes(1);
    });

    it('scores 0 for a grounded unconditional verdict, listing title and quote', async () => {
      respondWith([verdict(0, 'unconditional', 'revoke  the KEY now.')]);
      const result = await run([
        {
          title: 'Rogue key',
          alertIds: ['o1'],
          summaryMarkdown: 'Summary.',
          detailsMarkdown: 'Please\nRevoke the key now.',
        },
      ]);
      expect(result).toMatchObject({ score: 0, label: 'unconditional_containment' });
      expect((result as { explanation: string }).explanation).toContain('Rogue key');
      expect((result as { explanation: string }).explanation).toContain('revoke  the KEY now.');
    });

    it('scores 0 when one discovery is unconditional and another conditional', async () => {
      respondWith([
        verdict(0, 'conditional', 'x'),
        verdict(1, 'unconditional', 'Isolate the host.'),
      ]);
      const result = await run([
        { alertIds: ['o1'], detailsMarkdown: 'Verify first.' },
        { alertIds: [], detailsMarkdown: 'Isolate the host.' },
      ]);
      expect(result).toMatchObject({ score: 0 });
    });

    it('does not require a quote to be grounded for a conditional verdict', async () => {
      respondWith([verdict(0, 'conditional', 'paraphrased, not verbatim')]);
      expect(
        await run([{ alertIds: ['o1'], detailsMarkdown: 'Verify, then revoke.' }])
      ).toMatchObject({ score: 1 });
    });

    it('sends only scored discoveries, re-indexed from 0', async () => {
      respondWith([verdict(0, 'no_containment')]);
      await run([
        { title: 'confirmed', alertIds: ['c1'], detailsMarkdown: 'Revoke.' },
        { title: 'scored', alertIds: ['o1'], summaryMarkdown: 'S', detailsMarkdown: 'D' },
      ]);
      expect(lastInput()).toEqual([{ index: 0, title: 'scored', markdown: 'S\nD' }]);
    });
  });

  describe('post-checks', () => {
    it('is null/judge_ungrounded when an unconditional quote is not in the markdown', async () => {
      respondWith([verdict(0, 'unconditional', 'Disable the account.')]);
      expect(await run([{ alertIds: ['o1'], detailsMarkdown: 'Revoke the key.' }])).toMatchObject({
        score: null,
        label: 'judge_ungrounded',
      });
    });

    it('is null/judge_ungrounded when an unconditional verdict has an empty quote', async () => {
      respondWith([verdict(0, 'unconditional', '')]);
      expect(await run([{ alertIds: ['o1'], detailsMarkdown: 'Revoke the key.' }])).toMatchObject({
        score: null,
        label: 'judge_ungrounded',
      });
    });

    it('checks the quote against its own discovery, not another one', async () => {
      respondWith([verdict(0, 'no_containment'), verdict(1, 'unconditional', 'Revoke the key.')]);
      expect(
        await run([
          { alertIds: ['o1'], detailsMarkdown: 'Revoke the key.' },
          { alertIds: ['o1'], detailsMarkdown: 'Nothing here.' },
        ])
      ).toMatchObject({ score: null, label: 'judge_ungrounded' });
    });

    it('is null/judge_incomplete when an index is missing', async () => {
      respondWith([verdict(0, 'no_containment')]);
      expect(
        await run([
          { alertIds: ['o1'], detailsMarkdown: 'a' },
          { alertIds: ['o1'], detailsMarkdown: 'b' },
        ])
      ).toMatchObject({ score: null, label: 'judge_incomplete' });
    });

    it('is null/judge_incomplete when an index is duplicated', async () => {
      respondWith([
        verdict(0, 'no_containment'),
        verdict(0, 'conditional'),
        verdict(1, 'conditional'),
      ]);
      expect(
        await run([
          { alertIds: ['o1'], detailsMarkdown: 'a' },
          { alertIds: ['o1'], detailsMarkdown: 'b' },
        ])
      ).toMatchObject({ score: null, label: 'judge_incomplete' });
    });

    it('is null/judge_incomplete when the judge returns an index that was not sent', async () => {
      respondWith([verdict(0, 'no_containment'), verdict(7, 'no_containment')]);
      expect(await run([{ alertIds: ['o1'], detailsMarkdown: 'a' }])).toMatchObject({
        score: null,
        label: 'judge_incomplete',
      });
    });

    it('reports incomplete before ungrounded', async () => {
      respondWith([verdict(0, 'unconditional', 'made up')]);
      expect(
        await run([
          { alertIds: ['o1'], detailsMarkdown: 'a' },
          { alertIds: ['o1'], detailsMarkdown: 'b' },
        ])
      ).toMatchObject({ label: 'judge_incomplete' });
    });

    it('is null/judge_error and logs when the judge call throws', async () => {
      executeMock.mockRejectedValue(new Error('gateway down'));
      const result = await run([{ alertIds: ['o1'], detailsMarkdown: 'a' }]);
      expect(result).toMatchObject({ score: null, label: 'judge_error' });
      expect((result as { explanation: string }).explanation).toContain('gateway down');
      expect(log.error).toHaveBeenCalledTimes(1);
    });

    it('is null/judge_error when the response has no grade call', async () => {
      executeMock.mockResolvedValue({ toolCalls: [] } as never);
      expect(await run([{ alertIds: ['o1'], detailsMarkdown: 'a' }])).toMatchObject({
        score: null,
        label: 'judge_error',
      });
    });
  });

  describe('judge input', () => {
    it.each(AUDIT_SCENARIOS.map((scenario) => [scenario.id, scenario] as const))(
      '%s: carries no gold, group name, scenario id or operator context',
      async (_id, scenario) => {
        respondWith([verdict(0, 'no_containment')]);
        const realEvaluator = createAuditConditionalRemediationJudgeEvaluator({
          inferenceClient: {} as BoundInferenceClient,
          log,
        });
        const metadata = {
          Title: `${scenario.id}.baseline`,
          scenarioId: scenario.id,
          inputVariant: 'baseline',
          provenance: 'authored',
        };
        await run(
          [{ title: 'A title', alertIds: [], detailsMarkdown: 'Review the logs.' }],
          realEvaluator,
          metadata
        );

        const calls = executeMock.mock.calls[0][0];
        const sent = JSON.stringify(calls.input).toLowerCase();
        const forbidden = [
          scenario.id,
          scenario.operatorContext,
          ...Object.keys(scenario.gold.alertGroups),
          ...Object.values(scenario.gold.alertGroups).flat(),
          'confirmedgroups',
          'forbiddencocitation',
          'alertgroups',
        ];
        for (const text of forbidden) {
          expect({ text, present: sent.includes(text.toLowerCase()) }).toEqual({
            text,
            present: false,
          });
        }
        expect(Object.keys(calls.input as object)).toEqual(['discoveries']);
      }
    );
  });
});
