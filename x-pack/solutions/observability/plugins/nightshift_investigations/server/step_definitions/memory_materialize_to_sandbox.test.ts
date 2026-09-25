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
  hydrateMemoryWorkspace: jest.fn().mockResolvedValue({
    recalledIds: ['memory_a'],
    notification: '',
    summary: {
      retrievalMode: 'search',
      searchFallback: false,
      candidateCount: 2,
      recalledCount: 1,
      newPageCount: 1,
      catalogSize: 3,
      podReset: false,
      notificationChars: 0,
    },
  }),
}));

const hydrateMemoryWorkspaceMock = jest.mocked(hydrateMemoryWorkspace);

describe('memoryMaterializeToSandboxStepDefinition', () => {
  const esClient = { search: jest.fn() };
  const getScopedEsClient = jest.fn().mockReturnValue(esClient);
  const getMemoryEsClient = jest.fn().mockResolvedValue(esClient);
  const mockSession = { writeFiles: jest.fn(), mkdirs: jest.fn() } as unknown as SandboxSession;
  const telemetry = {
    reportSemanticMemoryMaterialized: jest.fn(),
    reportSemanticMemoryOptimized: jest.fn(),
  };

  const makeSandboxStart = (): SandboxPluginStart => ({
    getSession: jest.fn(),
    getSessionForSpace: jest.fn().mockReturnValue(mockSession),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getScopedEsClient.mockReturnValue(esClient);
    getMemoryEsClient.mockResolvedValue(esClient);
  });

  const createContext = (
    sandboxId: string,
    spaceId = 'default',
    prompt?: string,
    agentId?: string
  ) =>
    ({
      input: {
        sandbox_id: sandboxId,
        prompt,
        agent_id: agentId,
        conversation_id: 'conv-1',
      },
      rawInput: {
        sandbox_id: sandboxId,
        prompt,
        agent_id: agentId,
        conversation_id: 'conv-1',
      },
      contextManager: {
        getContext: jest
          .fn()
          .mockReturnValue({ workflow: { spaceId }, execution: { id: 'workflow-exec-1' } }),
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

  it('materializes memory with the injected internal client, never the scoped client', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => sandboxStart,
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
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
    expect(getMemoryEsClient).toHaveBeenCalledTimes(1);
    expect(getScopedEsClient).not.toHaveBeenCalled();
    expect(hydrateMemoryWorkspace).toHaveBeenCalledWith({
      session: mockSession,
      esClient,
      spaceId: 'default',
      agentId: 'significant-events.deductive-investigation',
      query: 'checkout lag',
      signal: expect.any(AbortSignal),
      logger: expect.anything(),
    });
    expect(result).toEqual({
      output: {
        sandbox_id: 'default__conv-1',
        recalled_ids: ['memory_a'],
        notification: '',
      },
    });
    expect(telemetry.reportSemanticMemoryMaterialized).toHaveBeenCalledWith({
      agent_id: 'significant-events.deductive-investigation',
      conversation_id: 'conv-1',
      workflow_execution_id: 'workflow-exec-1',
      outcome: 'success',
      retrieval_mode: 'search',
      search_fallback: false,
      candidate_count: 2,
      recalled_count: 1,
      new_page_count: 1,
      catalog_size: 3,
      pod_reset: false,
      notification_chars: 0,
    });
  });

  it('waits for memory readiness before starting a store operation', async () => {
    let resolveReadiness: (client: typeof esClient) => void = () => {};
    getMemoryEsClient.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveReadiness = resolve;
        })
    );
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => makeSandboxStart(),
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    const operation = definition.handler(
      createContext(
        'default__conv-1',
        'default',
        'checkout lag',
        'significant-events.deductive-investigation'
      )
    );
    await Promise.resolve();

    expect(hydrateMemoryWorkspace).not.toHaveBeenCalled();

    resolveReadiness(esClient);
    await operation;

    expect(hydrateMemoryWorkspace).toHaveBeenCalledTimes(1);
  });

  it('uses the obtained sandbox_id without re-scoping it', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => sandboxStart,
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    const result = await definition.handler(
      createContext(
        'marketing__conv-1',
        'marketing',
        undefined,
        'significant-events.deductive-investigation'
      )
    );

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('marketing', 'conv-1');
    expect(hydrateMemoryWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        session: mockSession,
        agentId: 'significant-events.deductive-investigation',
      })
    );
    expect(result).toEqual({
      output: {
        sandbox_id: 'marketing__conv-1',
        recalled_ids: ['memory_a'],
        notification: '',
      },
    });
  });

  it('throws when the sandbox is not configured', async () => {
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => undefined,
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    await expect(
      definition.handler(
        createContext(
          'default__conv-1',
          'default',
          undefined,
          'significant-events.deductive-investigation'
        )
      )
    ).rejects.toThrow(/sandbox is not configured/);
    expect(hydrateMemoryWorkspace).not.toHaveBeenCalled();
  });

  it('reports one failure event and rethrows when materialize fails', async () => {
    hydrateMemoryWorkspaceMock.mockRejectedValueOnce(new Error('write failed'));
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => makeSandboxStart(),
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    await expect(
      definition.handler(
        createContext(
          'default__conv-1',
          'default',
          'task',
          'significant-events.deductive-investigation'
        )
      )
    ).rejects.toThrow('write failed');
    expect(telemetry.reportSemanticMemoryMaterialized).toHaveBeenCalledTimes(1);
    expect(telemetry.reportSemanticMemoryMaterialized).toHaveBeenCalledWith({
      agent_id: 'significant-events.deductive-investigation',
      conversation_id: 'conv-1',
      workflow_execution_id: 'workflow-exec-1',
      outcome: 'failure',
    });
  });

  it('skips materialize when the memory flag is off', async () => {
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => makeSandboxStart(),
      getMemoryEsClient,
      logger: loggerMock.create(),
      isEnabled: () => false,
      telemetry: telemetry as never,
    });

    const result = await definition.handler(createContext('default__conv-1'));

    expect(hydrateMemoryWorkspace).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: {
        sandbox_id: 'default__conv-1',
        skipped: true,
        recalled_ids: [],
        notification: '',
      },
    });
  });

  it('skips memory materialize when agent_id is missing', async () => {
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => makeSandboxStart(),
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    const result = await definition.handler(createContext('default__conv-1', 'default', 'task'));

    expect(hydrateMemoryWorkspace).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: {
        sandbox_id: 'default__conv-1',
        skipped: true,
        recalled_ids: [],
        notification: '',
      },
    });
  });

  it('skips memory materialize for an unsupported agent', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => sandboxStart,
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    const result = await definition.handler(
      createContext('default__conv-1', 'default', 'task', 'another-agent')
    );

    expect(sandboxStart.getSessionForSpace).not.toHaveBeenCalled();
    expect(hydrateMemoryWorkspace).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: {
        sandbox_id: 'default__conv-1',
        skipped: true,
        recalled_ids: [],
        notification: '',
      },
    });
  });

  it('fails clearly when the internal Memory client is unavailable', async () => {
    const definition = memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: () => makeSandboxStart(),
      getMemoryEsClient: async () => {
        throw new Error('Semantic Memory internal Elasticsearch client is unavailable');
      },
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    await expect(
      definition.handler(
        createContext(
          'default__conv-1',
          'default',
          'task',
          'significant-events.deductive-investigation'
        )
      )
    ).rejects.toThrow('Semantic Memory internal Elasticsearch client is unavailable');
    expect(getScopedEsClient).not.toHaveBeenCalled();
  });
});
