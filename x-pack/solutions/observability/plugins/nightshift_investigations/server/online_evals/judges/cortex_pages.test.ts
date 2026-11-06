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

    it('sends the whole trace, ends with the scoring request, and scores from the reply', async () => {
      const chatComplete = jest.fn().mockResolvedValue({
        toolCalls: [{ function: { arguments: judgeOutput } }],
      });

      const { scores } = await cortexPageInfluenceJudge.evaluate({
        round: readTwoPages('Payments was slow.'),
        inferenceClient: { chatComplete } as unknown as BoundInferenceClient,
        log,
      });

      const { system, messages, tools, toolChoice, metadata } = chatComplete.mock.calls[0][0];
      expect(system).toContain('Cortex pages');
      expect(toolChoice).toEqual({ function: 'score_cortex_page_influence' });
      expect(metadata.connectorTelemetry).toMatchObject({
        pluginId: 'nightshift_online_evals',
        productFeature: 'nightshift',
      });
      expect(Object.keys(tools)).toEqual(['score_cortex_page_influence']);

      // user task, then six tool calls each as an assistant call and a tool result, then the answer
      expect(messages).toHaveLength(1 + 6 * 2 + 1 + 1);
      expect(messages[0]).toEqual({
        role: 'user',
        content: 'Investigate the checkout latency alert',
      });
      expect(messages[1]).toEqual({
        role: 'assistant',
        content: null,
        toolCalls: [
          {
            toolCallId: 'call_1',
            function: {
              name: 'nightshift_sandbox_view_file',
              arguments: { file_path: '/workspace/cortex/INDEX.md' },
            },
          },
        ],
      });
      expect(messages[4]).toEqual({
        role: 'tool',
        name: 'nightshift_sandbox_view_file',
        toolCallId: 'call_2',
        response: { result: expect.stringContaining('Checkout depends on the payments service.') },
      });
      expect(messages[13]).toEqual({ role: 'assistant', content: 'Payments was slow.' });
      const closing = messages[14];
      expect(closing.role).toBe('user');
      expect(closing.content).toContain('- cortex_service_checkout');
      expect(closing.content).toContain('- cortex_runbook_pool-exhaustion');

      expect(scores).toEqual([
        {
          name: 'cortex_pages_referenced',
          score: 1,
          label: '1/2 pages',
          explanation: 'cortex_service_checkout',
          metadata: { page_ids: ['cortex_service_checkout'], pages_read: 2 },
        },
        {
          name: 'cortex_pages_referenced_ratio',
          score: 0.5,
          label: '1/2 pages',
          explanation: 'Share of the pages read that the answer relies on',
          metadata: { page_ids: ['cortex_service_checkout'], pages_read: 2 },
        },
        {
          name: 'cortex_page_influence',
          score: 0.667,
          label: 'supporting (2/3)',
          explanation: 'The dependency note framed the search.',
        },
        {
          name: 'cortex_page_missed_influence',
          score: 0.333,
          label: 'minor (1/3)',
          explanation: 'The pool-size advice went unused.',
          direction: 'minimize',
        },
      ]);
    });

    it('tells 2 of 2 pages from 2 of 20 apart with the ratio', async () => {
      const pageIds = Array.from({ length: 20 }, (_, index) => `page-${index}`);
      const chatComplete = jest.fn().mockResolvedValue({
        toolCalls: [
          {
            function: {
              arguments: {
                ...judgeOutput,
                pages_used: ['cortex_service_page-0', 'cortex_service_page-1'],
              },
            },
          },
        ],
      });

      const { scores } = await cortexPageInfluenceJudge.evaluate({
        round: round(
          'answer',
          pageIds.map((slug) => view(`/workspace/cortex/services/${slug}.md`, 'content'))
        ),
        inferenceClient: { chatComplete } as unknown as BoundInferenceClient,
        log,
      });

      const byName = Object.fromEntries(scores.map((score) => [score.name, score]));
      expect(byName.cortex_pages_referenced).toEqual(
        expect.objectContaining({ score: 2, label: '2/20 pages' })
      );
      expect(byName.cortex_pages_referenced_ratio).toEqual(
        expect.objectContaining({ score: 0.1, label: '2/20 pages' })
      );
    });

    it('is not applicable, and skips the model, when no page was read', async () => {
      const chatComplete = jest.fn();

      const result = await cortexPageInfluenceJudge.evaluate({
        round: round('a'),
        inferenceClient: { chatComplete } as unknown as BoundInferenceClient,
        log,
      });

      expect(chatComplete).not.toHaveBeenCalled();
      expect(result).toEqual({
        scores: [],
        notApplicable: { reason: 'no Cortex pages were read' },
      });
    });
  });
});
