/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SandboxPluginStart, SandboxSession } from '@kbn/sandbox-plugin/server';
import { hydrateDecisionTreeWorkspace } from '../decision_trees/register_decision_trees';
import { decisionTreeHydrateStepDefinition } from './decision_tree_hydrate';

jest.mock('../decision_trees/register_decision_trees', () => ({
  hydrateDecisionTreeWorkspace: jest.fn().mockResolvedValue(3),
}));

describe('decisionTreeHydrateStepDefinition', () => {
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

  const createContext = (sandboxId: string, spaceId = 'default', prompt?: string) =>
    ({
      input: { sandbox_id: sandboxId, prompt },
      rawInput: { sandbox_id: sandboxId, prompt },
      contextManager: {
        getContext: jest.fn().mockReturnValue({ workflow: { spaceId } }),
        getFakeRequest: jest.fn(),
        getScopedEsClient,
        renderInputTemplate: jest.fn((val) => val),
        callKibanaApi: jest.fn(),
      },
      logger: loggerMock.create(),
      abortSignal: new AbortController().signal,
      stepId: 'hydrate_decision_trees',
      stepType: 'nightshift.decisionTreeHydrate',
    } as never);

  it('hydrates the sandbox handed to it by obtain_sandbox', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = decisionTreeHydrateStepDefinition({
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(createContext('default__conv-1'));

    // getSessionForSpace scopes internally, so the space-scoped id must be unscoped first.
    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('default', 'conv-1');
    expect(hydrateDecisionTreeWorkspace).toHaveBeenCalledWith({
      session: mockSession,
      esClient,
      logger: expect.anything(),
      spaceId: 'default',
      prompt: undefined,
      signal: expect.any(AbortSignal),
    });
    expect(result).toEqual({
      output: {
        sandbox_id: 'default__conv-1',
        conversation_id: 'conv-1',
        tree_count: 3,
      },
    });
  });

  // The reinforcement agent's own conversation resolves a differently-scoped sandbox key,
  // so the handler must not assume `default`.
  it('unscopes the sandbox id against the current Space', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = decisionTreeHydrateStepDefinition({
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(createContext('marketing__conv-1', 'marketing'));

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('marketing', 'conv-1');
    expect(hydrateDecisionTreeWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'marketing' })
    );
    expect(result).toEqual({
      output: {
        sandbox_id: 'marketing__conv-1',
        conversation_id: 'conv-1',
        tree_count: 3,
      },
    });
  });

  it('forwards the round prompt so accessed-trees filtering still applies', async () => {
    const definition = decisionTreeHydrateStepDefinition({
      getSandboxStart: () => makeSandboxStart(),
      logger: loggerMock.create(),
    });

    await definition.handler(createContext('default__conv-1', 'default', 'why is checkout slow?'));

    expect(hydrateDecisionTreeWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'why is checkout slow?' })
    );
  });

  // The combined materialize workflow installs with Cortex or Memory, so this step is registered
  // even when the tree feature is off. It must no-op rather than write trees or fail the round.
  it('skips without touching the sandbox when the feature is disabled', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = decisionTreeHydrateStepDefinition({
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
      isEnabled: () => false,
    });

    const result = await definition.handler(createContext('default__conv-1'));

    expect(sandboxStart.getSessionForSpace).not.toHaveBeenCalled();
    expect(hydrateDecisionTreeWorkspace).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: {
        sandbox_id: 'default__conv-1',
        conversation_id: 'conv-1',
        tree_count: 0,
        skipped: true,
      },
    });
  });

  it('throws when the sandbox is not configured', async () => {
    const definition = decisionTreeHydrateStepDefinition({
      getSandboxStart: () => undefined,
      logger: loggerMock.create(),
    });

    await expect(definition.handler(createContext('default__conv-1'))).rejects.toThrow(
      'The sandbox is not configured'
    );
  });

  it('requires a sandbox_id', () => {
    const definition = decisionTreeHydrateStepDefinition({
      getSandboxStart: () => makeSandboxStart(),
      logger: loggerMock.create(),
    });

    expect(definition.inputSchema.safeParse({}).success).toBe(false);
    expect(definition.inputSchema.safeParse({ sandbox_id: 'default__conv-1' }).success).toBe(true);
    // conversation_id alone is no longer accepted: the obtain-once contract is the whole point.
    expect(definition.inputSchema.safeParse({ conversation_id: 'conv-1' }).success).toBe(false);
  });
});
