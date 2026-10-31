/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createSkillInvocationEvaluator } from './skill_invocation_evaluator';

const VALID_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

const evaluateWith = (
  evaluator: ReturnType<typeof createSkillInvocationEvaluator>,
  traceId: string
) => evaluator.evaluate({ input: {}, output: { traceId }, expected: {}, metadata: {} });

describe('createSkillInvocationEvaluator', () => {
  let mockEsClient: jest.Mocked<EsClient>;
  let mockLog: jest.Mocked<ToolingLog>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockEsClient = {
      esql: {
        query: jest.fn(),
      },
    } as unknown as jest.Mocked<EsClient>;

    mockLog = {
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ToolingLog>;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockCounts = (totalSpans: number, skillInvoked: number) =>
    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[totalSpans, skillInvoked]],
    });

  const buildEvaluator = (skillName = 'endpoint-forensic-analysis') =>
    createSkillInvocationEvaluator({ traceEsClient: mockEsClient, log: mockLog, skillName });

  it('keeps the platform evaluator name so stored scores stay comparable', () => {
    expect(buildEvaluator('alert-analysis').name).toBe('Skill Invoked (alert-analysis)');
  });

  it('matches filestore.read and load_skill spans for the skill name', async () => {
    mockCounts(40, 1);

    await evaluateWith(buildEvaluator(), VALID_TRACE_ID);

    const calledQuery = (mockEsClient.esql.query as jest.Mock).mock.calls[0][0].query;
    expect(calledQuery).toContain(`trace.id == "${VALID_TRACE_ID}"`);
    expect(calledQuery).toContain('attributes.gen_ai.tool.name == "filestore.read"');
    expect(calledQuery).toContain('attributes.gen_ai.tool.name == "load_skill"');
    expect(calledQuery).toContain('*/endpoint-forensic-analysis/SKILL.md*');
    expect(calledQuery).toContain('*\\"endpoint-forensic-analysis\\"*');
  });

  it('returns 1 when load_skill invoked the skill', async () => {
    mockCounts(40, 1);

    const result = await evaluateWith(buildEvaluator(), VALID_TRACE_ID);

    expect(result.score).toBe(1);
  });

  it('returns 0 when the skill was not invoked', async () => {
    mockCounts(50, 0);

    const result = await evaluateWith(buildEvaluator(), VALID_TRACE_ID);

    expect(result.score).toBe(0);
  });

  it('retries until the trace is indexed', async () => {
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({
        columns: [
          { name: 'total_spans', type: 'long' },
          { name: 'skill_invoked', type: 'long' },
        ],
        values: [[0, 0]],
      })
      .mockResolvedValueOnce({
        columns: [
          { name: 'total_spans', type: 'long' },
          { name: 'skill_invoked', type: 'long' },
        ],
        values: [[50, 1]],
      });

    const promise = evaluateWith(buildEvaluator(), VALID_TRACE_ID);
    await jest.advanceTimersByTimeAsync(60_000);
    const result = await promise;

    expect(result.score).toBe(1);
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(2);
  });

  it('does not retry once the trace is indexed but the skill span is absent', async () => {
    mockCounts(50, 0);

    const result = await evaluateWith(buildEvaluator(), VALID_TRACE_ID);

    expect(result.score).toBe(0);
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable when no traceId is present', async () => {
    const result = await buildEvaluator().evaluate({
      input: {},
      output: {},
      expected: {},
      metadata: {},
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });

  it('throws for invalid skill names', () => {
    expect(() => buildEvaluator('bad"; DROP TABLE')).toThrow(/Invalid skillName/);
  });

  describe('skill_invoked clause against real tool-call shapes', () => {
    // ES|QL runs server-side, so mirror its semantics for the one clause that matters: per tool
    // name, the LIKE patterns that must match the serialized call arguments. Tool names and
    // patterns are parsed out of the query the evaluator actually sends, so a regression in the
    // query itself turns these red instead of only a substring check.
    const unescapeEsql = (literal: string) => literal.replace(/\\(.)/g, '$1');
    const likeToRegExp = (pattern: string) =>
      new RegExp(
        `^${pattern
          .split('*')
          .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
          .join('.*')}$`,
        's'
      );

    const countsAsInvocation = async (
      skillName: string,
      call: { tool: string; args: Record<string, unknown> }
    ) => {
      mockCounts(10, 0);
      await evaluateWith(buildEvaluator(skillName), VALID_TRACE_ID);

      const query = (mockEsClient.esql.query as jest.Mock).mock.calls.at(-1)[0].query as string;
      const clause = query.slice(query.indexOf('skill_invoked = COUNT('));
      const toolMarker = /attributes\.gen_ai\.tool\.name == "([^"]*)"/g;
      const markers = [...clause.matchAll(toolMarker)];

      const serializedArgs = JSON.stringify(call.args);
      return markers.some((marker, i) => {
        if (marker[1] !== call.tool) return false;
        const segment = clause.slice(marker.index, markers[i + 1]?.index ?? clause.length);
        const patterns = [
          ...segment.matchAll(
            /attributes\.gen_ai\.tool\.call\.arguments LIKE "((?:[^"\\]|\\.)*)"/g
          ),
        ].map((match) => unescapeEsql(match[1]));
        return patterns.some((pattern) => likeToRegExp(pattern).test(serializedArgs));
      });
    };

    it.each([
      ['bare skill id', { skill: 'alert-analysis' }],
      ['SKILL.md path', { skill: '/skills/security/alerts/alert-analysis/SKILL.md' }],
    ])('counts load_skill by %s', async (_label, args) => {
      expect(await countsAsInvocation('alert-analysis', { tool: 'load_skill', args })).toBe(true);
    });

    it('counts filestore.read of the SKILL.md path', async () => {
      expect(
        await countsAsInvocation('alert-analysis', {
          tool: 'filestore.read',
          args: { path: '/skills/security/alerts/alert-analysis/SKILL.md' },
        })
      ).toBe(true);
    });

    it('does not count filestore.read of the bare skill id', async () => {
      expect(
        await countsAsInvocation('alert-analysis', {
          tool: 'filestore.read',
          args: { path: 'alert-analysis' },
        })
      ).toBe(false);
    });

    it('does not count load_skill of a different skill', async () => {
      expect(
        await countsAsInvocation('alert-analysis', {
          tool: 'load_skill',
          args: { skill: 'entity-analytics' },
        })
      ).toBe(false);
    });

    it('does not count a skill whose name merely starts with the target name', async () => {
      expect(
        await countsAsInvocation('alert-analysis', {
          tool: 'load_skill',
          args: { skill: 'alert-analysis-extra' },
        })
      ).toBe(false);
    });

    it('does not count an unrelated tool that mentions the skill', async () => {
      expect(
        await countsAsInvocation('alert-analysis', {
          tool: 'platform.core.search',
          args: { query: 'alert-analysis' },
        })
      ).toBe(false);
    });
  });
});
