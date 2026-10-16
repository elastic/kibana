/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  type getEndpointHostDiagnosticsInputSchema,
  getEndpointHostDiagnosticsOutputSchema,
} from '../../../../../../common/workflows/step_types/endpoint/hosts';
import { getEndpointHostDiagnosticsStepDefinition } from '.';

type DiagnosticsContext = StepHandlerContext<typeof getEndpointHostDiagnosticsInputSchema>;

type CallApi = DiagnosticsContext['contextManager']['callKibanaApi'];

const createContext = (input: unknown, callKibanaApi: CallApi): DiagnosticsContext =>
  ({
    input,
    contextManager: {
      callKibanaApi,
      getScopedEsClient: jest.fn(),
      getFakeRequest: jest.fn(),
      getContext: jest.fn(),
      renderInputTemplate: jest.fn(),
    },
  } as unknown as DiagnosticsContext);

const component = (overrides: Record<string, unknown> = {}) => ({
  id: 'component-default',
  type: 'input',
  status: 'DEGRADED',
  message: 'component message',
  units: [],
  ...overrides,
});

const unit = (overrides: Record<string, unknown> = {}) => ({
  id: 'unit-default',
  type: 'input',
  status: 'STARTING',
  message: 'unit message',
  ...overrides,
});

const agentBody = (components: unknown[]) => ({
  status: 200,
  headers: {},
  body: { item: { id: 'agent-1', status: 'online', components } },
});

const policyResponseBody = () => ({
  status: 200,
  headers: {},
  body: {
    policy_response: {
      '@timestamp': '2022-04-04T18:38:15.7178887Z',
      agent: { id: 'agent-1', version: '8.0.0' },
      Endpoint: {
        policy: {
          applied: {
            id: 'policy-1',
            name: 'policy',
            status: 'success',
            version: 1,
            endpoint_policy_version: 1,
            actions: [],
          },
        },
      },
    },
  },
});

const run = async (input: unknown, callKibanaApi: CallApi) => {
  const result = await getEndpointHostDiagnosticsStepDefinition.handler(
    createContext(input, callKibanaApi)
  );
  expect(getEndpointHostDiagnosticsOutputSchema.safeParse(result.output).success).toBe(true);
  return result.output!;
};

describe('getEndpointHostDiagnosticsStepDefinition', () => {
  it('with include_healthy false keeps a STARTING Elastic Defend unit', async () => {
    const callKibanaApi = jest.fn().mockImplementation(async ({ path }: { path: string }) => {
      if (path.startsWith('/api/endpoint/policy_response')) {
        return policyResponseBody();
      }
      return agentBody([
        component({
          id: 'endpoint-default',
          type: 'endpoint',
          status: 'DEGRADED',
          units: [
            unit({ id: 'unit-starting', status: 'STARTING' }),
            unit({ id: 'unit-healthy', status: 'HEALTHY' }),
          ],
        }),
      ]);
    });

    const output = await run(
      { hosts: [{ agent_id: 'agent-1', endpoint_id: 'endpoint-1' }], include_healthy: false },
      callKibanaApi
    );

    const record = output.results[0];
    expect(record.agent).not.toBeNull();
    expect(record.agent!.components).toHaveLength(1);
    expect(record.agent!.components[0].units.map((entry) => entry.id)).toEqual(['unit-starting']);
    expect(record.agent!.components[0].units[0].status).toBe('STARTING');
    expect(record.policy_response!['@timestamp']).toBe('2022-04-04T18:38:15.7178887Z');
  });

  it('returns 10 components with components_total 12 when 12 non-healthy components are reported', async () => {
    const components = Array.from({ length: 12 }, (_, index) =>
      component({ id: `component-${index}`, status: 'DEGRADED' })
    );
    const callKibanaApi = jest.fn().mockResolvedValue(agentBody(components));

    const output = await run(
      { hosts: [{ agent_id: 'agent-1' }], include_healthy: false },
      callKibanaApi
    );

    const record = output.results[0];
    expect(record.agent!.components).toHaveLength(10);
    expect(record.agent!.components_total).toBe(12);
  });

  it('omits components_total when include_healthy false drops only healthy rows', async () => {
    const components = [
      component({ id: 'healthy-1', type: 'input', status: 'HEALTHY' }),
      component({ id: 'healthy-2', type: 'input', status: 'HEALTHY' }),
      component({ id: 'degraded-1', type: 'input', status: 'DEGRADED' }),
    ];
    const callKibanaApi = jest.fn().mockResolvedValue(agentBody(components));

    const output = await run(
      { hosts: [{ agent_id: 'agent-1' }], include_healthy: false },
      callKibanaApi
    );

    const record = output.results[0];
    expect(record.agent!.components.map((entry) => entry.id)).toEqual(['degraded-1']);
    expect(record.agent!.components_total).toBeUndefined();
  });

  it('returns one record per entry in input order and isolates a 403 to its own record', async () => {
    const callKibanaApi = jest.fn().mockImplementation(async ({ path }: { path: string }) => {
      if (path.endsWith('/agent-a')) {
        return {
          status: 200,
          headers: {},
          body: { item: { id: 'agent-a', status: 'online', components: [] } },
        };
      }
      throw new KibanaApiCallError({
        status: 403,
        headers: {},
        body: {},
        message: 'HTTP 403: forbidden',
      });
    });

    const output = await run(
      { hosts: [{ agent_id: 'agent-a' }, { agent_id: 'agent-b' }] },
      callKibanaApi
    );

    expect(output.results.map((record) => record.agent_id)).toEqual(['agent-a', 'agent-b']);
    expect(output.results[0].agent).not.toBeNull();
    expect(output.results[0].unauthorized).toEqual([]);
    expect(output.results[1].agent).toBeNull();
    expect(output.results[1].unauthorized).toEqual(['agent_components']);

    const singleOutput = await run({ hosts: [{ agent_id: 'agent-a' }] }, callKibanaApi);
    expect(output.results[0]).toEqual(singleOutput.results[0]);
  });

  it('records a non-403 read failure as unavailable on that record only', async () => {
    const callKibanaApi = jest.fn().mockImplementation(async ({ path }: { path: string }) => {
      if (path.endsWith('/agent-a')) {
        return {
          status: 200,
          headers: {},
          body: { item: { id: 'agent-a', status: 'online', components: [] } },
        };
      }
      throw new Error('boom');
    });

    const output = await run(
      { hosts: [{ agent_id: 'agent-a' }, { agent_id: 'agent-b' }] },
      callKibanaApi
    );

    expect(output.results[0].unavailable).toEqual([]);
    expect(output.results[1].agent).toBeNull();
    expect(output.results[1].unavailable).toEqual(['agent_components']);
  });

  it('omits an invalid numeric timestamp without losing either host record', async () => {
    const callKibanaApi = jest.fn().mockImplementation(async ({ path }: { path: string }) => {
      if (path.startsWith('/api/endpoint/policy_response')) {
        const response = policyResponseBody();
        return {
          ...response,
          body: {
            policy_response: {
              ...response.body.policy_response,
              '@timestamp': path.endsWith('endpoint-a') ? 1e20 : 0,
            },
          },
        };
      }
      return agentBody([]);
    });

    const output = await run(
      {
        hosts: [
          { agent_id: 'agent-a', endpoint_id: 'endpoint-a' },
          { agent_id: 'agent-b', endpoint_id: 'endpoint-b' },
        ],
      },
      callKibanaApi
    );

    expect(output.results.map((record) => record.agent_id)).toEqual(['agent-a', 'agent-b']);
    expect(output.results[0].policy_response).not.toBeNull();
    expect(output.results[0].policy_response!['@timestamp']).toBeUndefined();
    expect(output.results[1].policy_response!['@timestamp']).toBe('1970-01-01T00:00:00.000Z');
    expect(output.results.every((record) => record.agent !== null)).toBe(true);
  });

  it('treats a 404 on both reads as absent without unread parts', async () => {
    const output = await run(
      { hosts: [{ agent_id: 'agent-1', endpoint_id: 'endpoint-1' }] },
      jest
        .fn()
        .mockRejectedValue(
          new KibanaApiCallError({ status: 404, headers: {}, body: {}, message: 'missing' })
        )
    );

    expect(output.results[0]).toMatchObject({
      agent: null,
      policy_response: null,
      unauthorized: [],
      unavailable: [],
    });
  });

  it('projects numeric-string policy versions as numbers', async () => {
    const response = policyResponseBody();
    const applied = response.body.policy_response.Endpoint.policy.applied;
    const output = await run(
      { hosts: [{ agent_id: 'agent-1', endpoint_id: 'endpoint-1' }] },
      jest.fn().mockResolvedValue({
        ...response,
        body: {
          policy_response: {
            ...response.body.policy_response,
            Endpoint: {
              policy: { applied: { ...applied, version: '7', endpoint_policy_version: '7' } },
            },
          },
        },
      })
    );

    expect(output.results[0].policy_response?.Endpoint.policy.applied).toMatchObject({
      version: 7,
      endpoint_policy_version: 7,
    });
  });

  it('fails before any read when more than MAX_HOST_TARGETS entries are given', async () => {
    const callKibanaApi = jest.fn();
    const hosts = Array.from({ length: 11 }, (_, index) => ({ agent_id: `agent-${index}` }));

    await expect(
      getEndpointHostDiagnosticsStepDefinition.handler(createContext({ hosts }, callKibanaApi))
    ).rejects.toThrow();

    expect(callKibanaApi).not.toHaveBeenCalled();
  });
});
