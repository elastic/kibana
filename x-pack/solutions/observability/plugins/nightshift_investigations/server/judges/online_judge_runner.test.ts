/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { memoryScheduledJudgesStepDefinition } from '../step_definitions/memory_scheduled_judges';
import {
  computeOnlineScoreDocumentId,
  fetchCandidateBackgroundRounds,
  findAlreadyJudgedTraceIds,
  ingestOnlineScores,
  NIGHTSHIFT_MEMORY_JUDGES_MONITOR_ID,
  NIGHTSHIFT_MEMORY_JUDGES_MONITOR_NAME,
  ONLINE_SCORES_DATA_STREAM,
  READ_JUDGE_EVALUATOR_NAME,
  runScheduledMemoryJudges,
  shouldSampleTrace,
  WRITE_JUDGE_EVALUATOR_NAME,
} from '.';

describe('server/judges/online_judge_runner', () => {
  const logger = loggerMock.create();

  describe('computeOnlineScoreDocumentId', () => {
    it('computes a deterministic SHA-256 document id matching Evals OnlineScoreService', () => {
      const base = {
        space_ids: ['marketing', 'default'],
        monitor: {
          id: NIGHTSHIFT_MEMORY_JUDGES_MONITOR_ID,
          name: NIGHTSHIFT_MEMORY_JUDGES_MONITOR_NAME,
        },
        trace_id: 'be01f25c8dec495ba1346f752bdce9e0',
        evaluator: { name: READ_JUDGE_EVALUATOR_NAME, version: 'v1' },
        score: { name: 'memory_read_utility', value: 0.5 },
      };

      const id1 = computeOnlineScoreDocumentId(base);
      const id2 = computeOnlineScoreDocumentId({
        ...base,
        space_ids: ['default', 'marketing'],
      });
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{64}$/);

      // Bumping evaluator.version produces a distinct document ID so re-judging is allowed
      const idV2 = computeOnlineScoreDocumentId({
        ...base,
        evaluator: { name: READ_JUDGE_EVALUATOR_NAME, version: 'v2' },
      });
      expect(idV2).not.toBe(id1);
    });
  });

  describe('ingestOnlineScores', () => {
    it('indexes with create op_type and treats 409 Conflict as skipped', async () => {
      const bulk = jest.fn().mockResolvedValue({
        items: [{ create: { status: 201 } }, { create: { status: 409 } }],
      });
      const esClient = { bulk } as never;

      const summary = await ingestOnlineScores({
        esClient,
        logger,
        documents: [
          {
            space_ids: ['default'],
            trace_id: 'trace-1',
            monitor: { id: 'm1', name: 'M1' },
            evaluator: { name: READ_JUDGE_EVALUATOR_NAME, version: 'v1' },
            score: { name: 'memory_read_utility', value: 1 },
          },
          {
            space_ids: ['default'],
            trace_id: 'trace-2',
            monitor: { id: 'm1', name: 'M1' },
            evaluator: { name: READ_JUDGE_EVALUATOR_NAME, version: 'v1' },
            score: { name: 'memory_read_utility', value: 0 },
          },
        ],
      });

      expect(summary).toEqual({ created: 1, skipped: 1, errors: [] });
      expect(bulk).toHaveBeenCalledTimes(1);
      const [{ operations }] = bulk.mock.calls[0];
      expect(operations[0]).toEqual({
        create: {
          _index: ONLINE_SCORES_DATA_STREAM,
          _id: expect.stringMatching(/^[0-9a-f]{64}$/),
        },
      });
    });
  });

  describe('fetchCandidateBackgroundRounds', () => {
    it('aggregates recalled_ids, opened_ids, and applied_writes per T_background trace_id', async () => {
      const search = jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                trace_id: 'bg-trace-1',
                attributes: {
                  'nightshift.background_trace_id': 'bg-trace-1',
                  'nightshift.foreground_trace_id': 'fg-trace-1',
                  'nightshift.round_id': 'round-1',
                  'gen_ai.conversation.id': 'conv-1',
                  'nightshift.recalled_ids': JSON.stringify(['memory_a', 'memory_b']),
                },
              },
            },
            {
              _source: {
                trace_id: 'bg-trace-1',
                attributes: {
                  'nightshift.background_trace_id': 'bg-trace-1',
                  'nightshift.opened_ids': JSON.stringify(['memory_a']),
                  'nightshift.applied_writes': JSON.stringify([
                    {
                      store: 'semantic_memory',
                      item_id: 'memory_a',
                      action: 'update',
                      after_content: 'Updated memory content.',
                    },
                  ]),
                },
              },
            },
          ],
        },
      });

      const rounds = await fetchCandidateBackgroundRounds({
        esClient: { search } as never,
        spaceId: 'default',
      });

      expect(rounds).toEqual([
        {
          traceId: 'bg-trace-1',
          foregroundTraceId: 'fg-trace-1',
          roundId: 'round-1',
          conversationId: 'conv-1',
          recalledIds: ['memory_a', 'memory_b'],
          openedIds: ['memory_a'],
          appliedWrites: [
            {
              store: 'semantic_memory',
              item_id: 'memory_a',
              action: 'update',
              after_content: 'Updated memory content.',
            },
          ],
        },
      ]);
    });
  });

  describe('runScheduledMemoryJudges & memoryScheduledJudgesStepDefinition', () => {
    it('filters already-judged traces, applies subsampling, and writes read + write scores to .evaluation-online-scores', async () => {
      const search = jest.fn(async ({ index, query }: any) => {
        if (index === ONLINE_SCORES_DATA_STREAM) {
          const queryJson = JSON.stringify(query);
          if (
            queryJson.includes('"v1"') &&
            (queryJson.includes(READ_JUDGE_EVALUATOR_NAME) ||
              queryJson.includes(WRITE_JUDGE_EVALUATOR_NAME))
          ) {
            return {
              hits: { hits: [{ _source: { trace_id: 'bg-trace-already-judged' } }] },
            };
          }
          return { hits: { hits: [] } };
        }
        return { hits: { hits: [] } };
      });

      const bulk = jest.fn(async ({ operations }: any) => ({
        items: operations
          .filter((_: unknown, idx: number) => idx % 2 === 0)
          .map(() => ({ create: { status: 201 } })),
      }));

      const candidates = [
        {
          traceId: 'bg-trace-already-judged',
          roundId: 'round-old',
          conversationId: 'conv-old',
          recalledIds: ['memory_old'],
          openedIds: ['memory_old'],
          appliedWrites: [],
        },
        {
          traceId: 'bg-trace-new',
          foregroundTraceId: 'ebf7677419199e9edc53ac5dc26b9e0e',
          roundId: 'round-new',
          conversationId: 'conv-new',
          recalledIds: ['memory_a', 'memory_b'],
          openedIds: ['memory_a'],
          appliedWrites: [
            {
              store: 'cortex' as const,
              item_id: 'cortex_service_checkout',
              action: 'upsert',
              version: 2,
              before_content: 'old',
              after_content: 'new content',
            },
          ],
        },
      ];

      const v1Summary = await runScheduledMemoryJudges({
        esClient: { search, bulk } as never,
        spaceId: 'default',
        evaluatorVersion: 'v1',
        candidatesOverride: candidates,
        logger,
      });

      expect(v1Summary).toEqual({
        scannedCount: 2,
        sampledCount: 1,
        createdScoresCount: 2, // 1 read score + 1 write score for bg-trace-new
        skippedDuplicateCount: 0,
        errorCount: 0,
      });

      // Bumping evaluatorVersion to v2 re-evaluates bg-trace-already-judged as well!
      const v2Summary = await runScheduledMemoryJudges({
        esClient: { search, bulk } as never,
        spaceId: 'default',
        evaluatorVersion: 'v2',
        candidatesOverride: candidates,
        logger,
      });
      expect(v2Summary.sampledCount).toBe(2);
      expect(v2Summary.createdScoresCount).toBe(3);

      // Verify step definition handler when disabled vs enabled
      const disabledStep = memoryScheduledJudgesStepDefinition({
        logger,
        isEnabled: () => false,
      });
      const skippedResult = await disabledStep.handler({
        input: {},
        rawInput: {},
        contextManager: {
          getContext: () => ({ workflow: { id: 'wf-1', spaceId: 'default' } }),
          getScopedEsClient: () => ({ search, bulk }),
        },
        logger,
        abortSignal: new AbortController().signal,
        stepId: 'run_scheduled_judges',
        stepType: 'nightshift.memoryScheduledJudges',
      } as never);
      expect(skippedResult.output).toMatchObject({ status: 'ok', skipped: true });
    });

    it('deterministically subsamples traces according to sampleRate', () => {
      expect(shouldSampleTrace('trace-1', 1)).toBe(true);
      expect(shouldSampleTrace('trace-1', 0)).toBe(false);
      expect(shouldSampleTrace('trace-1', 0.5)).toBe(shouldSampleTrace('trace-1', 0.5));
    });

    it('returns empty set from findAlreadyJudgedTraceIds when traceIds is empty', async () => {
      const res = await findAlreadyJudgedTraceIds({
        esClient: {} as never,
        spaceId: 'default',
        traceIds: [],
        evaluatorName: READ_JUDGE_EVALUATOR_NAME,
        evaluatorVersion: 'v1',
      });
      expect(res.size).toBe(0);
    });
  });
});
