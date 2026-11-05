/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EvidenceRound } from '@kbn/evals-plugin/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { cortexPageInfluenceJudge } from './cortex_page_influence';
import { cortexPagesReadJudge } from './cortex_pages_read';

const view = (path: string, text: string, extra: object = {}) => ({
  tool_id: 'nightshift_sandbox_view_file',
  arguments: { file_path: path },
  result: [{ type: 'other', data: text, ...extra }],
});

const round = (answer: string, steps: EvidenceRound['steps'] = []): EvidenceRound => ({
  input: { message: 'Investigate the checkout latency alert' },
  steps,
  response: { message: answer },
});

const readTwoPages = (answer: string) =>
  round(answer, [
    view('/workspace/cortex/INDEX.md', 'index'),
    view('/workspace/cortex/services/checkout.md', 'Checkout depends on the payments service.'),
    view('/workspace/cortex/services/checkout.md', 'Checkout depends on the payments service.'),
    view('/workspace/cortex/runbooks/pool-exhaustion.md', 'Raise the pool size.'),
    view('/workspace/cortex/services/missing.md', 'No such file', { type: 'error' }),
    { tool_id: 'platform.core.search', arguments: { query: 'x' }, result: { hits: 1 } },
  ]);

describe('cortex page judges', () => {
  const log = loggingSystemMock.createLogger();

  describe('nightshift_cortex_pages_read', () => {
    it('counts distinct pages and ignores the index, failed reads and other tools', async () => {
      const { scores } = await cortexPagesReadJudge.evaluate({ round: readTwoPages('a'), log });

      expect(scores).toEqual([
        expect.objectContaining({
          name: 'cortex_pages_read',
          score: 2,
          metadata: {
            page_ids: ['cortex_service_checkout', 'cortex_runbook_pool-exhaustion'],
          },
        }),
      ]);
    });

    it('scores 0 when no page was read', async () => {
      const { scores } = await cortexPagesReadJudge.evaluate({ round: round('a'), log });

      expect(scores[0]).toEqual(expect.objectContaining({ score: 0, explanation: 'none' }));
    });
  });

  describe('nightshift_cortex_page_influence', () => {
    const judgeOutput = {
      pages_used: ['cortex_service_checkout', 'cortex_service_checkout', 'cortex_service_made_up'],
      influence: 2,
      influence_reasoning: 'The dependency note framed the search.',
      missed_influence: 1,
      missed_influence_reasoning: 'The pool-size advice went unused.',
    };

    it('sends the page contents and counts the pages the model says were used, and grades influence', async () => {
      const prompt = jest.fn().mockResolvedValue({
        toolCalls: [{ function: { arguments: judgeOutput } }],
      });

      const { scores } = await cortexPageInfluenceJudge.evaluate({
        round: readTwoPages('Payments was slow.'),
        inferenceClient: { prompt } as unknown as BoundInferenceClient,
        log,
      });

      const { input, toolChoice } = prompt.mock.calls[0][0];
      expect(toolChoice).toEqual({ function: 'score_cortex_page_influence' });
      expect(input.pages).toContain('## cortex_service_checkout\nCheckout depends on the payments');
      expect(input.pages).toContain('## cortex_runbook_pool-exhaustion\nRaise the pool size.');
      expect(input.answer).toBe('Payments was slow.');
      expect(scores).toEqual([
        {
          name: 'cortex_pages_referenced',
          score: 1,
          label: '1/2 pages',
          explanation: 'cortex_service_checkout',
          metadata: { page_ids: ['cortex_service_checkout'], pages_read: 2 },
        },
        {
          name: 'cortex_page_influence',
          score: 0.667,
          label: '2/3',
          explanation: 'The dependency note framed the search.',
        },
        {
          name: 'cortex_page_missed_influence',
          score: 0.333,
          label: '1/3',
          explanation: 'The pool-size advice went unused.',
          direction: 'minimize',
        },
      ]);
    });

    it('is not applicable, and skips the model, when no page was read', async () => {
      const prompt = jest.fn();

      const result = await cortexPageInfluenceJudge.evaluate({
        round: round('a'),
        inferenceClient: { prompt } as unknown as BoundInferenceClient,
        log,
      });

      expect(prompt).not.toHaveBeenCalled();
      expect(result).toEqual({
        scores: [],
        notApplicable: { reason: 'no Cortex pages were read' },
      });
    });
  });
});
