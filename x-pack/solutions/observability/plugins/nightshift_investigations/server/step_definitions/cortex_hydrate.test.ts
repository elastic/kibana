/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SandboxPluginStart, SandboxSession } from '@kbn/sandbox-plugin/server';
import { hydrateCortexWorkspace } from '../cortex/register_cortex';
import { cortexHydrateStepDefinition } from './cortex_hydrate';

jest.mock('../cortex/register_cortex', () => ({
  hydrateCortexWorkspace: jest
    .fn()
    .mockResolvedValue(
      'Cortex pages materialized this turn:\n- `/workspace/cortex/services/checkout.md`'
    ),
}));

describe('cortexHydrateStepDefinition', () => {
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
    sandboxId: string | undefined,
    spaceId = 'default',
    conversationId?: string
  ) =>
    ({
      input: { sandbox_id: sandboxId, conversation_id: conversationId },
      rawInput: { sandbox_id: sandboxId, conversation_id: conversationId },
      contextManager: {
        getContext: jest.fn().mockReturnValue({ workflow: { spaceId } }),
        getFakeRequest: jest.fn(),
        getScopedEsClient,
        renderInputTemplate: jest.fn((val) => val),
        callKibanaApi: jest.fn(),
      },
      logger: loggerMock.create(),
      abortSignal: new AbortController().signal,
      stepId: 'hydrate_cortex',
      stepType: 'nightshift.cortexHydrate',
    } as never);

  it('hydrates the sandbox with the request-scoped ES client', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = cortexHydrateStepDefinition({
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(createContext('default__conv-1'));

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('default', 'conv-1');
    expect(hydrateCortexWorkspace).toHaveBeenCalledWith({
      session: mockSession,
      esClient,
      spaceId: 'default',
      signal: expect.any(AbortSignal),
      logger: expect.anything(),
    });
    expect(result).toEqual({
      output: {
        sandbox_id: 'default__conv-1',
        conversation_id: 'conv-1',
        notification: '',
      },
    });
  });

  it('uses the obtained sandbox_id without re-scoping it', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = cortexHydrateStepDefinition({
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(createContext('marketing__conv-1', 'marketing'));

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('marketing', 'conv-1');
    expect(hydrateCortexWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'marketing' })
    );
    expect(result).toEqual({
      output: {
        sandbox_id: 'marketing__conv-1',
        conversation_id: 'conv-1',
        notification: '',
      },
    });
  });

  it('scopes a legacy conversation_id using the workflow Space', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = cortexHydrateStepDefinition({
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(createContext(undefined, 'marketing', 'conv-1'));

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('marketing', 'conv-1');
    expect(hydrateCortexWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'marketing' })
    );
    expect(result).toEqual({
      output: {
        sandbox_id: 'marketing__conv-1',
        conversation_id: 'conv-1',
        notification: '',
      },
    });
  });

  it('rejects input missing both sandbox_id and conversation_id', async () => {
    const definition = cortexHydrateStepDefinition({
      getSandboxStart: () => makeSandboxStart(),
      logger: loggerMock.create(),
    });

    expect(definition.inputSchema.safeParse({}).success).toBe(false);
    await expect(definition.handler(createContext(undefined))).rejects.toThrow(
      'Either sandbox_id or conversation_id is required.'
    );
    expect(hydrateCortexWorkspace).not.toHaveBeenCalled();
  });

  it('throws when the sandbox is not configured', async () => {
    const definition = cortexHydrateStepDefinition({
      getSandboxStart: () => undefined,
      logger: loggerMock.create(),
    });

    await expect(definition.handler(createContext('default__conv-1'))).rejects.toThrow(
      /sandbox is not configured/
    );
    expect(hydrateCortexWorkspace).not.toHaveBeenCalled();
  });

  it('skips materialize when the cortex flag is off', async () => {
    const definition = cortexHydrateStepDefinition({
      getSandboxStart: () => makeSandboxStart(),
      logger: loggerMock.create(),
      isEnabled: () => false,
    });

    const result = await definition.handler(createContext('default__conv-1'));

    expect(hydrateCortexWorkspace).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: {
        sandbox_id: 'default__conv-1',
        conversation_id: 'conv-1',
        skipped: true,
        notification: '',
      },
    });
  });
});
