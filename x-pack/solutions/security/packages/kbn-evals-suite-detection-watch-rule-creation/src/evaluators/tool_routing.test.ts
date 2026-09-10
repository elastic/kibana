/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DRAFT_STEP_ID } from '../constants';
import {
  assertToolSpansReachable,
  createToolRoutingEvaluator,
  extractConversationId,
} from './tool_routing';

const result = (overrides: Record<string, unknown> = {}) =>
  ({
    stepExecutions: [{ stepId: DRAFT_STEP_ID, output: { conversation_id: 'conv-1' } }],
    ...overrides,
  } as never);
describe('extractConversationId', () => {
  it('reads the draft step conversation id', () => {
    expect(extractConversationId(result())).toBe('conv-1');
  });

  it('returns undefined when the draft step persisted none', () => {
    expect(
      extractConversationId(
        result({ stepExecutions: [{ stepId: DRAFT_STEP_ID, output: {} }] as never })
      )
    ).toBeUndefined();
  });
});

jest.mock('@kbn/security-evals-workflow-traces', () => ({
  readAgentToolCallsFromTraces: jest.fn(),
}));

import { readAgentToolCallsFromTraces } from '@kbn/security-evals-workflow-traces';

const mockedReader = readAgentToolCallsFromTraces as jest.MockedFunction<
  typeof readAgentToolCallsFromTraces
>;

describe('createToolRoutingEvaluator', () => {
  const log = { info: jest.fn(), debug: jest.fn(), warning: jest.fn(), error: jest.fn() } as never;
  const traceEsClient = {} as never;
  const run = (payload: unknown) =>
    createToolRoutingEvaluator({ traceEsClient, log }).evaluate({
      input: {} as never,
      output: payload as never,
      expected: {} as never,
      metadata: undefined,
    });

  beforeEach(() => mockedReader.mockReset());

  it('scores 1 when the agent called the required tool', async () => {
    mockedReader.mockResolvedValue({
      toolCallIds: ['security.create_detection_rule'],
      unavailable: false,
    });
    const r = await run({
      stepExecutions: [{ stepId: 'draft_creation', output: { conversation_id: 'c1' } }],
    });
    expect(r.score).toBe(1);
  });

  it('scores 0.5 when calls follow the required tool (unstable routing)', async () => {
    mockedReader.mockResolvedValue({
      toolCallIds: ['security.create_detection_rule', 'security.labs_search'],
      unavailable: false,
    });
    const r = await run({
      stepExecutions: [{ stepId: 'draft_creation', output: { conversation_id: 'c1' } }],
    });
    expect(r.score).toBe(0.5);
  });

  it('scores 0 when tools were called but not the required one', async () => {
    mockedReader.mockResolvedValue({ toolCallIds: ['other.tool'], unavailable: false });
    const r = await run({
      stepExecutions: [{ stepId: 'draft_creation', output: { conversation_id: 'c1' } }],
    });
    expect(r.score).toBe(0);
  });

  it('never scores 0 when spans are unreachable - unmeasured is N/A', async () => {
    mockedReader.mockResolvedValue({ toolCallIds: [], unavailable: true });
    const r = await run({ stepExecutions: [] });
    expect(r.score).toBeNull();
    expect(r.label).toBe('unavailable');
  });

  it('passes the draft conversation id to the shared reader', async () => {
    mockedReader.mockResolvedValue({ toolCallIds: [], unavailable: false });
    await run({
      stepExecutions: [{ stepId: 'draft_creation', output: { conversation_id: 'conv-9' } }],
    });
    expect(mockedReader).toHaveBeenCalledWith(
      expect.objectContaining({ conversationIds: 'conv-9' })
    );
  });
});

describe('assertToolSpansReachable', () => {
  const log = { info: jest.fn(), debug: jest.fn(), warning: jest.fn(), error: jest.fn() } as never;
  const traceEsClient = {} as never;

  beforeEach(() => mockedReader.mockReset());

  it('passes when the probe conversation has tool spans', async () => {
    mockedReader.mockResolvedValue({
      toolCallIds: ['security.create_detection_rule'],
      unavailable: false,
    });
    await expect(
      assertToolSpansReachable({
        traceEsClient,
        probe: {
          stepExecutions: [{ stepId: 'draft_creation', output: { conversation_id: 'c1' } }],
        } as never,
        log,
      })
    ).resolves.toBeUndefined();
  });

  it('throws when no spans are reachable so setup fails loudly', async () => {
    mockedReader.mockResolvedValue({ toolCallIds: [], unavailable: true });
    await expect(
      assertToolSpansReachable({ traceEsClient, probe: { stepExecutions: [] } as never, log })
    ).rejects.toThrow(/No agent TOOL spans are reachable/);
  });

  it('skips the assertion when the quality gate declined the probe', async () => {
    await expect(
      assertToolSpansReachable({
        traceEsClient,
        probe: { skipped: true, stepExecutions: [] } as never,
        log,
      })
    ).resolves.toBeUndefined();
    expect(mockedReader).not.toHaveBeenCalled();
  });
});
