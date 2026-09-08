/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RuleCreationResult } from '../rule_creation_client';
import {
  DRAFT_STEP_ID,
  GENERATE_ESQL_TOOL_ID,
  RULE_CREATION_TOOL_ID,
  TRAJECTORY_MAX_TOOL_CALLS,
  TRAJECTORY_MIN_TOOL_CALLS,
} from '../constants';
import { createTrajectoryEvaluator } from './trajectory';

const log = {
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
} as unknown as ToolingLog;

/** Builds a mock ES client whose esql.query always returns the given ordered tool names. */
const esWith = (names: string[]) =>
  ({
    esql: {
      query: jest.fn(async () => ({
        columns: [{ name: 'attributes.gen_ai.tool.name', type: 'keyword' }],
        values: names.map((n) => [n]),
      })),
    },
  } as unknown as EsClient);

/** Returns an empty response (no rows) — simulates a join that found no spans. */
const esEmpty = () =>
  ({
    esql: {
      query: jest.fn(async () => ({
        columns: [{ name: 'attributes.gen_ai.tool.name', type: 'keyword' }],
        values: [],
      })),
    },
  } as unknown as EsClient);

const result = (over: Partial<RuleCreationResult> = {}): RuleCreationResult =>
  ({
    rule: { name: 'r' },
    pendingApproval: false,
    traceId: 'trace-1',
    workflowExecutionId: 'exec-1',
    stepExecutions: [{ stepId: DRAFT_STEP_ID, output: { conversation_id: 'conv-1' } }],
    ...over,
  } as unknown as RuleCreationResult);

const evaluate = (client: EsClient, output: RuleCreationResult) =>
  createTrajectoryEvaluator({ traceEsClient: client, log }).evaluate({
    input: {},
    output,
    expected: {},
    metadata: undefined,
  } as never);

describe('createTrajectoryEvaluator', () => {
  // Real span values: generate_esql is namespaced as platform.core.generate_esql
  const happyPath = [GENERATE_ESQL_TOOL_ID, RULE_CREATION_TOOL_ID];

  it('scores 1 for a perfect two-call sequence in the right order', async () => {
    const res = await evaluate(esWith(happyPath), result());
    expect(res.score).toBe(1);
  });

  it('reflects the join key used in the explanation', async () => {
    const res = await evaluate(esWith(happyPath), result());
    expect(res.explanation).toContain('workflow trace id');
  });

  describe('count sub-dimension', () => {
    it('scores count=1 when call count is within the expected window', async () => {
      const names = Array(TRAJECTORY_MIN_TOOL_CALLS).fill(GENERATE_ESQL_TOOL_ID);
      names[names.length - 1] = RULE_CREATION_TOOL_ID;
      const res = await evaluate(esWith(names), result());
      expect((res.metadata as Record<string, unknown>).countScore).toBe(1);
    });

    it('scores count < 1 when call count is below minimum', async () => {
      // Only one call instead of TRAJECTORY_MIN_TOOL_CALLS
      const res = await evaluate(esWith([RULE_CREATION_TOOL_ID]), result());
      const { countScore } = res.metadata as Record<string, number>;
      expect(countScore).toBeGreaterThan(0);
      expect(countScore).toBeLessThan(1);
    });

    it('scores count < 1 when call count is above maximum', async () => {
      const names = Array(TRAJECTORY_MAX_TOOL_CALLS + 1).fill(GENERATE_ESQL_TOOL_ID);
      const res = await evaluate(esWith(names), result());
      const { countScore } = res.metadata as Record<string, number>;
      expect(countScore).toBeGreaterThanOrEqual(0);
      expect(countScore).toBeLessThan(1);
    });

    it('scores count=0 when call count reaches 2× maximum', async () => {
      const names = Array(TRAJECTORY_MAX_TOOL_CALLS * 2).fill(GENERATE_ESQL_TOOL_ID);
      const res = await evaluate(esWith(names), result());
      const { countScore } = res.metadata as Record<string, number>;
      expect(countScore).toBe(0);
    });
  });

  describe('order sub-dimension', () => {
    it('scores order=1 when generate_esql precedes create_detection_rule', async () => {
      const res = await evaluate(esWith(happyPath), result());
      expect((res.metadata as Record<string, unknown>).orderScore).toBe(1);
    });

    it('scores order=0 when the tools appear in the wrong order', async () => {
      const reversed = [RULE_CREATION_TOOL_ID, GENERATE_ESQL_TOOL_ID];
      const res = await evaluate(esWith(reversed), result());
      expect((res.metadata as Record<string, unknown>).orderScore).toBe(0);
    });

    it('scores order=0 when generate_esql is absent', async () => {
      const res = await evaluate(esWith([RULE_CREATION_TOOL_ID]), result());
      expect((res.metadata as Record<string, unknown>).orderScore).toBe(0);
    });

    it('scores order=0 when create_detection_rule is absent', async () => {
      const res = await evaluate(esWith([GENERATE_ESQL_TOOL_ID]), result());
      expect((res.metadata as Record<string, unknown>).orderScore).toBe(0);
    });
  });

  describe('hallucination sub-dimension', () => {
    it('scores hallucination=1 when all tools are known', async () => {
      const res = await evaluate(esWith(happyPath), result());
      expect((res.metadata as Record<string, unknown>).hallucinationScore).toBe(1);
    });

    it('scores hallucination < 1 when unknown tools are present', async () => {
      const withHallucination = [...happyPath, 'unknown_tool'];
      const res = await evaluate(esWith(withHallucination), result());
      const { hallucinationScore, hallucinated } = res.metadata as Record<string, unknown>;
      expect(hallucinationScore).toBeLessThan(1);
      expect(hallucinated).toEqual(['unknown_tool']);
    });

    it('scores hallucination=0 when all tools are unknown', async () => {
      const res = await evaluate(esWith(['fake_tool_a', 'fake_tool_b']), result());
      expect((res.metadata as Record<string, unknown>).hallucinationScore).toBe(0);
    });
  });

  describe('unavailable cases', () => {
    it('returns score: null when no join keys exist', async () => {
      const res = await evaluate(
        esWith(happyPath),
        result({ traceId: undefined, stepExecutions: [] as never })
      );
      expect(res.score).toBeNull();
      expect(res.label).toBe('unavailable');
    });

    it('returns score: null when no TOOL spans are reachable', async () => {
      const res = await evaluate(esEmpty(), result());
      expect(res.score).toBeNull();
      expect(res.label).toBe('unavailable');
    });

    it('falls back to conversation id when trace join finds no spans', async () => {
      const client = {
        esql: {
          query: jest.fn(async ({ query }: { query: string }) => {
            if (query.includes('trace.id')) {
              return {
                columns: [{ name: 'attributes.gen_ai.tool.name', type: 'keyword' }],
                values: [],
              };
            }
            return {
              columns: [{ name: 'attributes.gen_ai.tool.name', type: 'keyword' }],
              values: happyPath.map((n) => [n]),
            };
          }),
        },
      } as unknown as EsClient;

      const res = await evaluate(client, result());
      expect(res.score).toBe(1);
      expect(res.explanation).toContain('gen_ai.conversation.id');
    });
  });
});
