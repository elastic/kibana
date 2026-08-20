/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createSecuritySkillInvocationEvaluator } from './security_skill_invocation_evaluator';

const VALID_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

const evaluateWith = (
  evaluator: ReturnType<typeof createSecuritySkillInvocationEvaluator>,
  traceId: string
) => evaluator.evaluate({ input: {}, output: { traceId }, expected: {}, metadata: {} });

describe('createSecuritySkillInvocationEvaluator', () => {
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

  it('matches filestore.read and load_skill spans for the skill name', async () => {
    const evaluator = createSecuritySkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'endpoint-forensic-analysis',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[40, 1]],
    });

    await evaluateWith(evaluator, VALID_TRACE_ID);

    const calledQuery = (mockEsClient.esql.query as jest.Mock).mock.calls[0][0].query;
    expect(calledQuery).toContain(`trace.id == "${VALID_TRACE_ID}"`);
    expect(calledQuery).toContain('attributes.gen_ai.tool.name == "filestore.read"');
    expect(calledQuery).toContain('attributes.gen_ai.tool.name == "load_skill"');
    expect(calledQuery).toContain('*/endpoint-forensic-analysis/SKILL.md*');
    expect(calledQuery).toContain('*endpoint-forensic-analysis*');
  });

  it('returns 1 when load_skill invoked the skill', async () => {
    const evaluator = createSecuritySkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'endpoint-forensic-analysis',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[40, 1]],
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBe(1);
  });

  it('returns 0 when the skill was not invoked', async () => {
    const evaluator = createSecuritySkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'endpoint-forensic-analysis',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 0]],
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBe(0);
  });

  it('retries until the trace is indexed', async () => {
    const evaluator = createSecuritySkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'endpoint-forensic-analysis',
    });

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

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await jest.advanceTimersByTimeAsync(60_000);
    const result = await promise;

    expect(result.score).toBe(1);
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(2);
  });

  it('does not retry once the trace is indexed but the skill span is absent', async () => {
    const evaluator = createSecuritySkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'endpoint-forensic-analysis',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 0]],
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBe(0);
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable when no traceId is present', async () => {
    const evaluator = createSecuritySkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'endpoint-forensic-analysis',
    });

    const result = await evaluator.evaluate({
      input: {},
      output: {},
      expected: {},
      metadata: {},
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });

  it('throws for invalid skill names', () => {
    expect(() =>
      createSecuritySkillInvocationEvaluator({
        traceEsClient: mockEsClient,
        log: mockLog,
        skillName: 'bad"; DROP TABLE',
      })
    ).toThrow(/Invalid skillName/);
  });
});
