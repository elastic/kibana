/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { HookExecutionMode, HookLifecycle } from '@kbn/agent-builder-server';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../common';
import { registerFindingsRecorder } from './register_findings_recorder';
import { runFindingsPass } from './run_pass';

jest.mock('./run_pass', () => ({ runFindingsPass: jest.fn().mockResolvedValue(true) }));

describe('registerFindingsRecorder', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggerMock.create();

  const setup = () => {
    const registerCycleHook = jest.fn();
    const register = jest.fn();
    const coordinator = {
      startLive: jest.fn(),
      runFinal: jest.fn(async ({ run }) =>
        run({ signal: new AbortController().signal, claimWrite: () => true })
      ),
      release: jest.fn(),
      memory: jest.fn(() => ({ turns: () => [], remember: jest.fn() })),
    };
    registerFindingsRecorder({
      agentBuilder: { hooks: { registerCycleHook, register } } as never,
      deps: {} as never,
      logger,
      coordinator: coordinator as never,
    });
    return { registerCycleHook, register, coordinator };
  };

  beforeEach(() => jest.clearAllMocks());

  it('registers a cycle hook bound to the investigator that never appends to the agent', () => {
    const { registerCycleHook, coordinator } = setup();

    const [definition] = registerCycleHook.mock.calls[0];
    expect(definition).toMatchObject({
      id: 'nightshift.findings_recorder',
      when: { everyCycles: 4 },
      boundAgents: [NIGHTSHIFT_INVESTIGATION_AGENT_ID],
    });

    const abort = new AbortController();
    const handler = definition.getHandler({
      conversation: { id: 'c1' },
      request,
      abortSignal: abort.signal,
      input: { message: 'Why is checkout failing?' },
    });
    const api = { append: jest.fn() };
    handler({ steps: [] }, api);

    expect(coordinator.startLive).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'c1', executionSignal: abort.signal })
    );
    expect(api.append).not.toHaveBeenCalled();
  });

  it('sits the cycle hook out when there is no conversation', () => {
    const { registerCycleHook } = setup();

    const [definition] = registerCycleHook.mock.calls[0];
    expect(
      definition.getHandler({
        conversation: {},
        request,
        abortSignal: new AbortController().signal,
      })
    ).toBeUndefined();
  });

  it('registers a blocking after-execution hook', () => {
    const { register } = setup();

    const [bundle] = register.mock.calls[0];
    expect(bundle.hooks[HookLifecycle.afterExecution]).toMatchObject({
      mode: HookExecutionMode.blocking,
    });
  });

  const afterExecution = (overrides = {}) => {
    const { register, coordinator } = setup();
    const { handler } = register.mock.calls[0][0].hooks[HookLifecycle.afterExecution];
    const context = {
      agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
      conversationId: 'c1',
      conversationAccess: 'readWrite',
      request,
      round: {
        status: ConversationRoundStatus.completed,
        input: { message: 'Why is checkout failing?' },
        steps: [
          {
            type: 'tool_call',
            tool_call_id: 't1',
            tool_id: 'reply_user',
            params: { response: 'Root cause: bad deploy' },
            results: [],
          },
        ],
        response: { message: 'Done.' },
      },
      ...overrides,
    };
    return { run: () => handler(context), coordinator };
  };

  it("runs the final pass with the agent's reply_user answer", async () => {
    const { run, coordinator } = afterExecution();

    await run();

    expect(coordinator.runFinal).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'c1' })
    );
    expect(runFindingsPass).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        conversationId: 'c1',
        answer: 'Root cause: bad deploy',
        question: 'Why is checkout failing?',
      })
    );
  });

  it('ignores other agents and read-only runs', async () => {
    const other = afterExecution({ agentId: 'someone-else' });
    await other.run();
    const readOnly = afterExecution({ conversationAccess: 'readOnly' });
    await readOnly.run();

    expect(other.coordinator.runFinal).not.toHaveBeenCalled();
    expect(readOnly.coordinator.runFinal).not.toHaveBeenCalled();
  });

  it('releases the investigation when the round did not complete', async () => {
    const failed = afterExecution({
      round: { status: ConversationRoundStatus.inProgress, steps: [] },
    });

    await failed.run();

    expect(failed.coordinator.runFinal).not.toHaveBeenCalled();
    expect(failed.coordinator.release).toHaveBeenCalledWith('c1');
  });

  it('never fails the investigation when the final pass throws', async () => {
    const { run, coordinator } = afterExecution();
    coordinator.runFinal.mockRejectedValue(new Error('boom'));

    await expect(run()).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
