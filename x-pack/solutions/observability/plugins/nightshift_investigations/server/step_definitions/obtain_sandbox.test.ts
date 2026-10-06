/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SandboxPluginStart, SandboxSession } from '@kbn/sandbox-plugin/server';
import { obtainSandboxStepDefinition } from './obtain_sandbox';

describe('obtainSandboxStepDefinition', () => {
  const statFiles = jest.fn();
  const mockSession = { statFiles } as unknown as SandboxSession;

  const makeSandboxStart = (): SandboxPluginStart => ({
    getSession: jest.fn(),
    getSessionForSpace: jest.fn().mockReturnValue(mockSession),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    statFiles.mockResolvedValue([{ path: '/workspace', exists: true, is_dir: true }]);
  });

  const createContext = (
    conversationId: string,
    spaceId = 'default',
    extra: { required?: boolean } = {},
    workflowLogger = loggerMock.create()
  ) =>
    ({
      input: { conversation_id: conversationId, ...extra },
      rawInput: { conversation_id: conversationId, ...extra },
      contextManager: {
        getContext: jest.fn().mockReturnValue({ workflow: { spaceId } }),
        getFakeRequest: jest.fn(),
        getScopedEsClient: jest.fn(),
        renderInputTemplate: jest.fn((val) => val),
        callKibanaApi: jest.fn(),
      },
      logger: workflowLogger,
      abortSignal: new AbortController().signal,
      stepId: 'obtain_sandbox',
      stepType: 'nightshift.obtainSandbox',
    } as never);

  it('allocates the sandbox and returns the space-scoped sandbox_id', async () => {
    const sandboxStart = makeSandboxStart();
    const workflowLogger = loggerMock.create();
    const pluginLogger = loggerMock.create();
    const definition = obtainSandboxStepDefinition({
      getSandboxStart: () => sandboxStart,
      logger: pluginLogger,
    });

    const result = await definition.handler(createContext('conv-1', 'default', {}, workflowLogger));

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('default', 'conv-1');
    expect(statFiles).toHaveBeenCalledWith(['/workspace']);
    expect(pluginLogger.info).toHaveBeenCalledWith('Obtained sandbox default__conv-1');
    expect(workflowLogger.info).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: { sandbox_id: 'default__conv-1', conversation_id: 'conv-1' },
    });
  });

  // Sandbox tools key the workspace on `<space>__<conversation>`. Hydrate writers
  // must receive that same id or they write into a workspace the agent never reads.
  it('scopes the sandbox_id to the space the workflow runs in', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = obtainSandboxStepDefinition({
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(createContext('conv-1', 'marketing'));

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('marketing', 'conv-1');
    expect(result).toEqual({
      output: { sandbox_id: 'marketing__conv-1', conversation_id: 'conv-1' },
    });
  });

  it('throws when the sandbox is not configured', async () => {
    const definition = obtainSandboxStepDefinition({
      getSandboxStart: () => undefined,
      logger: loggerMock.create(),
    });

    await expect(definition.handler(createContext('conv-1'))).rejects.toThrow(
      /sandbox is not configured/
    );
    expect(statFiles).not.toHaveBeenCalled();
  });

  it('skips allocate and still returns sandbox_id when required is false', async () => {
    const definition = obtainSandboxStepDefinition({
      getSandboxStart: () => undefined,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(
      createContext('conv-1', 'default', { required: false })
    );

    expect(statFiles).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: {
        sandbox_id: 'default__conv-1',
        conversation_id: 'conv-1',
        skipped: true,
      },
    });
  });

  it.each([
    [
      'session acquisition',
      () =>
        ({
          getSession: jest.fn(),
          getSessionForSpace: jest.fn(() => {
            throw new Error('sandbox is not configured');
          }),
        } as unknown as SandboxPluginStart),
    ],
    [
      'workspace allocation',
      () => {
        statFiles.mockRejectedValueOnce(new Error('sandbox API unavailable'));
        return makeSandboxStart();
      },
    ],
  ])('skips an optional sandbox after %s failure', async (_name, createSandboxStart) => {
    const definition = obtainSandboxStepDefinition({
      getSandboxStart: createSandboxStart,
      logger: loggerMock.create(),
    });

    await expect(
      definition.handler(createContext('conv-1', 'default', { required: false }))
    ).resolves.toEqual({
      output: {
        sandbox_id: 'default__conv-1',
        conversation_id: 'conv-1',
        skipped: true,
      },
    });
  });

  it.each([
    [
      'session acquisition',
      () =>
        ({
          getSession: jest.fn(),
          getSessionForSpace: jest.fn(() => {
            throw new Error('session failed');
          }),
        } as unknown as SandboxPluginStart),
    ],
    [
      'workspace allocation',
      () => {
        statFiles.mockRejectedValueOnce(new Error('allocation failed'));
        return makeSandboxStart();
      },
    ],
  ])('fails closed after required %s failure', async (_name, createSandboxStart) => {
    const definition = obtainSandboxStepDefinition({
      getSandboxStart: createSandboxStart,
      logger: loggerMock.create(),
    });

    await expect(definition.handler(createContext('conv-1'))).rejects.toThrow(/failed/);
  });
});
