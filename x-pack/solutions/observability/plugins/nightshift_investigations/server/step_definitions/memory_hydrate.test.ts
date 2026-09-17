/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { hydrateMemoryWorkspace } from '../memory/register_memory';
import { memoryHydrateStepDefinition } from './memory_hydrate';

jest.mock('../memory/register_memory', () => ({
  hydrateMemoryWorkspace: jest.fn().mockResolvedValue(undefined),
}));

describe('memoryHydrateStepDefinition', () => {
  const esClient = { search: jest.fn() };
  const apiClient = { writeFiles: jest.fn(), mkdirs: jest.fn() };
  const getScopedEsClient = jest.fn().mockReturnValue(esClient);

  beforeEach(() => {
    jest.clearAllMocks();
    getScopedEsClient.mockReturnValue(esClient);
  });

  const createContext = (conversationId: string, spaceId = 'default', prompt?: string) =>
    ({
      input: { conversation_id: conversationId, prompt },
      rawInput: { conversation_id: conversationId, prompt },
      contextManager: {
        getContext: jest.fn().mockReturnValue({ workflow: { spaceId } }),
        getFakeRequest: jest.fn(),
        getScopedEsClient,
        renderInputTemplate: jest.fn((val) => val),
        callKibanaApi: jest.fn(),
      },
      logger: loggerMock.create(),
      abortSignal: new AbortController().signal,
      stepId: 'hydrate_memory',
      stepType: 'nightshift.memoryHydrate',
    }) as never;

  it('hydrates the sandbox with the request-scoped ES client', async () => {
    const definition = memoryHydrateStepDefinition({
      getConnectionManager: () => ({ apiClient } as never),
      logger: loggerMock.create(),
    });

    const result = await definition.handler(createContext('conv-1', 'default', 'checkout lag'));

    expect(hydrateMemoryWorkspace).toHaveBeenCalledWith({
      apiClient,
      conversationId: 'default__conv-1',
      esClient,
      spaceId: 'default',
      query: 'checkout lag',
      signal: expect.any(AbortSignal),
      logger: expect.anything(),
    });
    expect(result).toEqual({ output: { conversation_id: 'default__conv-1' } });
  });

  it('scopes the workspace to the space the workflow runs in', async () => {
    const definition = memoryHydrateStepDefinition({
      getConnectionManager: () => ({ apiClient } as never),
      logger: loggerMock.create(),
    });

    const result = await definition.handler(createContext('conv-1', 'marketing'));

    expect(hydrateMemoryWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'marketing__conv-1' })
    );
    expect(result).toEqual({ output: { conversation_id: 'marketing__conv-1' } });
  });

  it('throws when the sandbox is not configured', async () => {
    const definition = memoryHydrateStepDefinition({
      getConnectionManager: () => undefined,
      logger: loggerMock.create(),
    });

    await expect(definition.handler(createContext('conv-1'))).rejects.toThrow(
      /sandbox is not configured/
    );
    expect(hydrateMemoryWorkspace).not.toHaveBeenCalled();
  });
});
