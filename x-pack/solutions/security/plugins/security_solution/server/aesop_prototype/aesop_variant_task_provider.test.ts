/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsTaskContext } from '@kbn/evals-plugin/server/task_providers';
import { CONVERSE_TIMEOUT_MS, createAesopVariantTaskProvider } from './aesop_variant_task_provider';

const createContext = (overrides: Partial<EvalsTaskContext> = {}) => {
  const callKibanaApi = jest.fn().mockResolvedValue({
    status: 200,
    headers: {},
    body: { conversation_id: 'conv-1', trace_id: ['abc123'], response: { message: 'done' } },
  });
  const context = {
    input: { question: 'Triage alert 42' },
    connectorId: 'connector-1',
    agentId: 'agent-1',
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    getInferenceClient: jest.fn(),
    callKibanaApi,
    ...overrides,
  } as unknown as EvalsTaskContext;
  return { context, callKibanaApi: (overrides.callKibanaApi ?? callKibanaApi) as jest.Mock };
};

const sentOverrides = (callKibanaApi: jest.Mock) =>
  callKibanaApi.mock.calls[0][0].body.configuration_overrides;

describe('createAesopVariantTaskProvider', () => {
  const provider = createAesopVariantTaskProvider();

  it('pins the converse call to the given skill', async () => {
    const { context, callKibanaApi } = createContext({ params: { skill_id: 'triage-v2' } });

    const result = await provider.run(context);

    expect(sentOverrides(callKibanaApi)).toEqual({ skill_ids: ['triage-v2'] });
    expect(callKibanaApi.mock.calls[0][0].body.input).toBe('Triage alert 42');
    expect(result.traceId).toBe('abc123');
    expect(result.output).toEqual({ message: 'done', conversation_id: 'conv-1' });
  });

  it('gives the converse call a longer timeout than the self-client default', async () => {
    const { context, callKibanaApi } = createContext({ params: { skill_id: 'triage-v2' } });

    await provider.run(context);

    expect(callKibanaApi.mock.calls[0][0].timeout).toBe(CONVERSE_TIMEOUT_MS);
    expect(CONVERSE_TIMEOUT_MS).toBeGreaterThan(60_000);
  });

  it.each([true, 'true'])('runs the no-skill baseline for no_skill=%p', async (noSkill) => {
    const { context, callKibanaApi } = createContext({ params: { no_skill: noSkill } });

    await provider.run(context);

    expect(sentOverrides(callKibanaApi)).toEqual({
      skill_ids: [],
      enable_elastic_capabilities: false,
    });
  });

  it('prefers the no-skill baseline when a skill id is also given', async () => {
    const { context, callKibanaApi } = createContext({
      params: { no_skill: true, skill_id: 'triage-v2' },
    });

    await provider.run(context);

    expect(sentOverrides(callKibanaApi).skill_ids).toEqual([]);
  });

  it.each([undefined, {}, { skill_id: '' }, { no_skill: 'false' }, { skill_id: 7 }])(
    'rejects params %p without a skill id or no_skill',
    async (params) => {
      const { context, callKibanaApi } = createContext({ params });

      await expect(provider.run(context)).rejects.toThrow(/params.skill_id or params.no_skill/);
      expect(callKibanaApi).not.toHaveBeenCalled();
    }
  );

  describe('params.tool_ids', () => {
    const createToolContext = (params: Record<string, unknown>) => {
      const callKibanaApi = jest.fn().mockImplementation(async ({ method }: { method: string }) =>
        method === 'GET'
          ? {
              status: 200,
              headers: {},
              body: {
                configuration: { tools: [{ tool_ids: ['platform.core.execute_esql', 'other'] }] },
              },
            }
          : { status: 200, headers: {}, body: { conversation_id: 'conv-1', response: {} } }
      );
      return createContext({ params, callKibanaApi });
    };
    const converseCall = (callKibanaApi: jest.Mock) =>
      callKibanaApi.mock.calls.find(([call]) => call.method === 'POST')[0];

    it('adds the tools to the agent own tools for the arm', async () => {
      const { context, callKibanaApi } = createToolContext({
        skill_id: 'triage-v2',
        tool_ids: ['platform.core.cases', 'platform.core.execute_esql'],
      });

      await provider.run(context);

      expect(callKibanaApi.mock.calls[0][0].path).toBe('/api/agent_builder/agents/agent-1');
      expect(converseCall(callKibanaApi).body.configuration_overrides).toEqual({
        skill_ids: ['triage-v2'],
        tools: [{ tool_ids: ['platform.core.execute_esql', 'other', 'platform.core.cases'] }],
      });
    });

    it.each([[[]], [undefined], ['platform.core.cases'], [[3, '']]])(
      'leaves the agent tools alone for tool_ids %p',
      async (toolIds) => {
        const { context, callKibanaApi } = createToolContext({
          skill_id: 'triage-v2',
          tool_ids: toolIds,
        });

        await provider.run(context);

        expect(callKibanaApi).toHaveBeenCalledTimes(1);
        expect(converseCall(callKibanaApi).body.configuration_overrides).toEqual({
          skill_ids: ['triage-v2'],
        });
      }
    );

    it('gives the no-skill baseline no extra tools', async () => {
      const { context, callKibanaApi } = createToolContext({
        no_skill: true,
        tool_ids: ['platform.core.cases'],
      });

      await provider.run(context);

      expect(callKibanaApi).toHaveBeenCalledTimes(1);
      expect(converseCall(callKibanaApi).body.configuration_overrides.tools).toBeUndefined();
    });
  });

  it('requires an agent id', async () => {
    const { context } = createContext({ agentId: undefined, params: { no_skill: true } });

    await expect(provider.run(context)).rejects.toThrow(/requires an agent_id/);
  });
});
