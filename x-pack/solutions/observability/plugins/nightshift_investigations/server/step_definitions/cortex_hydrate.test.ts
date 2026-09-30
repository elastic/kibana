/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import type { SandboxPluginStart, SandboxSession } from '@kbn/sandbox-plugin/server';
import { hydrateCortexWorkspace } from '../cortex/register_cortex';
import { cortexHydrateStepDefinition } from './cortex_hydrate';

jest.mock('../cortex/register_cortex', () => ({
  hydrateCortexWorkspace: jest.fn().mockResolvedValue(undefined),
}));

describe('cortexHydrateStepDefinition', () => {
  const esClient = { search: jest.fn() };
  const getScopedEsClient = jest.fn().mockReturnValue(esClient);
  const mockSession = { writeFiles: jest.fn(), mkdirs: jest.fn() } as unknown as SandboxSession;
  const analytics = coreMock.createSetup().analytics;

  const makeSandboxStart = (): SandboxPluginStart => ({
    getSession: jest.fn(),
    getSessionForSpace: jest.fn().mockReturnValue(mockSession),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getScopedEsClient.mockReturnValue(esClient);
  });

  const createContext = (conversationId: string, spaceId = 'default') =>
    ({
      input: { conversation_id: conversationId },
      rawInput: { conversation_id: conversationId },
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
      analytics,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(createContext('conv-1'));

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('default', 'conv-1');
    expect(hydrateCortexWorkspace).toHaveBeenCalledWith({
      session: mockSession,
      esClient,
      spaceId: 'default',
      signal: expect.any(AbortSignal),
      analytics,
      conversationId: 'conv-1',
      logger: expect.anything(),
    });
    expect(result).toEqual({ output: { conversation_id: 'conv-1' } });
  });

  // The sandbox session is keyed on (spaceId, conversationId); the step passes the workflow
  // spaceId so the session matches the one the agent tools will resolve from the request.
  it('scopes the workspace to the space the workflow runs in', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = cortexHydrateStepDefinition({
      getSandboxStart: () => sandboxStart,
      analytics,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(createContext('conv-1', 'marketing'));

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('marketing', 'conv-1');
    expect(hydrateCortexWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'marketing' })
    );
    expect(result).toEqual({ output: { conversation_id: 'conv-1' } });
  });

  it('throws when the sandbox is not configured', async () => {
    const definition = cortexHydrateStepDefinition({
      getSandboxStart: () => undefined,
      analytics,
      logger: loggerMock.create(),
    });

    await expect(definition.handler(createContext('conv-1'))).rejects.toThrow(
      /sandbox is not configured/
    );
    expect(hydrateCortexWorkspace).not.toHaveBeenCalled();
  });
});
