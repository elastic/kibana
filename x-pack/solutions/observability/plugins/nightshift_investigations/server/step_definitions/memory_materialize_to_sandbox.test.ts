/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SandboxPluginStart, SandboxSession } from '@kbn/sandbox-plugin/server';
import { hydrateMemoryWorkspace } from '../memory/register_memory';
import { memoryMaterializeToSandboxStepDefinition } from './memory_materialize_to_sandbox';

jest.mock('../memory/register_memory', () => ({
  hydrateMemoryWorkspace: jest.fn().mockResolvedValue(''),
}));

describe('memoryMaterializeToSandboxStepDefinition', () => {
  const esClient = { search: jest.fn() };
  const getScopedEsClient = jest.fn().mockReturnValue(esClient);
  const mockSession = { writeFiles: jest.fn(), mkdirs: jest.fn() } as unknown as SandboxSession;

  const makeSandboxStart = (): SandboxPluginStart => ({
    getSession: jest.fn(),
    getSessionForSpace: jest.fn().mockReturnValue(mockSession),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getScopedEsClient.mockReturnValue(esClient);
  });

  const createContext = (
    sandboxId: string,
    spaceId = 'default',
    prompt?: string,
    agentId?: string
  ) =>
    ({
      input: { sandbox_id: sandboxId, prompt, agent_id: agentId },
      rawInput: { sandbox_id: sandboxId, prompt, agent_id: agentId },
      contextManager: {
        getContext: jest.fn().mockReturnValue({ workflow: { spaceId } }),
        getFakeRequest: jest.fn(),
        getScopedEsClient,
        renderInputTemplate: jest.fn((val) => val),
        callKibanaApi: jest.fn(),
      },
      logger: loggerMock.create(),
      abortSignal: new AbortController().signal,
      stepId: 'memory_materialize_to_sandbox',
      stepType: 'nightshift.memoryMaterializeToSandbox',
    } as never);

  it('materializes memory into the sandbox with the request-scoped ES client', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(
      createContext(
        'default__conv-1',
        'default',
        'checkout lag',
        'significant-events.deductive-investigation'
      )
    );

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('default', 'conv-1');
    expect(hydrateMemoryWorkspace).toHaveBeenCalledWith({
      session: mockSession,
      esClient,
      agentId: 'significant-events.deductive-investigation',
      query: 'checkout lag',
      signal: expect.any(AbortSignal),
      logger: expect.anything(),
    });
    expect(result).toEqual({ output: { sandbox_id: 'default__conv-1', notification: '' } });
  });

  it('uses the obtained sandbox_id without re-scoping it', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(
      createContext('marketing__conv-1', 'marketing', undefined, 'agent-1')
    );

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('marketing', 'conv-1');
    expect(hydrateMemoryWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ session: mockSession, agentId: 'agent-1' })
    );
    expect(result).toEqual({ output: { sandbox_id: 'marketing__conv-1', notification: '' } });
  });

  it('throws when the sandbox is not configured', async () => {
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => undefined,
      logger: loggerMock.create(),
    });

    await expect(
      definition.handler(createContext('default__conv-1', 'default', undefined, 'agent-1'))
    ).rejects.toThrow(/sandbox is not configured/);
    expect(hydrateMemoryWorkspace).not.toHaveBeenCalled();
  });

  it('skips materialize when the memory flag is off', async () => {
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => makeSandboxStart(),
      logger: loggerMock.create(),
      isEnabled: () => false,
    });

    const result = await definition.handler(createContext('default__conv-1'));

    expect(hydrateMemoryWorkspace).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: { sandbox_id: 'default__conv-1', skipped: true, notification: '' },
    });
  });

  it('skips memory materialize when agent_id is missing', async () => {
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => makeSandboxStart(),
      logger: loggerMock.create(),
    });

    const result = await definition.handler(createContext('default__conv-1', 'default', 'task'));

    expect(hydrateMemoryWorkspace).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: { sandbox_id: 'default__conv-1', skipped: true, notification: '' },
    });
  });
});
