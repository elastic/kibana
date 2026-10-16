/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { resolveEndpointHostsStepDefinition } from './resolve_endpoint_hosts_step';

type MetadataHost = Record<string, unknown>;

const createMockContext = (rawInput: Record<string, unknown>) =>
  ({
    input: rawInput,
    config: {},
    rawInput,
    contextManager: {
      getContext: jest.fn(),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn(),
      getFakeRequest: jest.fn(),
      callKibanaApi: jest.fn(),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-step',
    stepType: 'security.resolveEndpointHosts',
  } as unknown as StepHandlerContext<unknown, unknown>);

interface MockRouteResponse {
  status?: number;
  headers?: Record<string, string>;
  body: unknown;
}

type RouteResponder = (params: { method: string; path: string }) => MockRouteResponse;

const installRouteResponder = (
  context: StepHandlerContext<unknown, unknown>,
  responder: RouteResponder
): jest.Mock => {
  const callKibanaApi = context.contextManager.callKibanaApi as unknown as jest.Mock;
  callKibanaApi.mockImplementation(async (params: { method: string; path: string }) => ({
    status: 200,
    headers: {},
    ...responder(params),
  }));
  return callKibanaApi;
};

const readQuery = (path: string): URLSearchParams => new URL(`http://kibana${path}`).searchParams;

const metadataHost = ({
  hostStatus = 'healthy',
  endpointId,
  fleetId,
  version = 1,
  endpointPolicyVersion = 1,
}: {
  hostStatus?: string;
  endpointId: string;
  fleetId: string;
  version?: number | string;
  endpointPolicyVersion?: number | string;
}): MetadataHost => ({
  host_status: hostStatus,
  last_checkin: '2024-01-01T00:00:00.000Z',
  metadata: {
    agent: { id: endpointId, version: '8.0.0', type: 'endpoint' },
    elastic: { agent: { id: fleetId } },
    host: {
      hostname: fleetId,
      name: fleetId,
      ip: ['10.0.0.1'],
      architecture: 'x86_64',
      os: { name: 'Linux', version: '1', platform: 'linux', family: 'linux' },
    },
    Endpoint: {
      status: 'enrolled',
      policy: {
        applied: {
          id: 'policy-1',
          name: 'Policy',
          status: 'success',
          endpoint_policy_version: endpointPolicyVersion,
          version,
        },
      },
    },
  },
  policy_info: {
    agent: {
      configured: { id: 'policy-1', revision: 1 },
      applied: { id: 'policy-1', revision: 1 },
    },
    endpoint: { id: 'policy-1', revision: 1 },
  },
});

const runawayError = (status: number): KibanaApiCallError =>
  new KibanaApiCallError({
    status,
    headers: {},
    body: { message: 'route failure' },
    message: `HTTP ${status}: route failure`,
  });

describe('resolveEndpointHostsStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves numeric string metadata policy versions as numbers', async () => {
    const context = createMockContext({ targets: [{ agent_id: 'fleet-1' }] });
    const host = metadataHost({
      endpointId: 'endpoint-1',
      fleetId: 'fleet-1',
      version: '2',
      endpointPolicyVersion: '1',
    });
    installRouteResponder(context, () => ({ body: { data: [host] } }));

    const result = await resolveEndpointHostsStepDefinition.handler(context);

    expect(result.output!.results[0].status).toBe('resolved');
    expect(result.output!.results[0].hosts[0].metadata?.Endpoint.policy.applied).toMatchObject({
      version: 2,
      endpoint_policy_version: 1,
    });
    expect(result.output!.results[0].hosts[0].policy_info).toEqual(host.policy_info);
  });

  it('reports 12 visible candidates for one entry as ambiguous with a cut host list', async () => {
    const context = createMockContext({ targets: [{ hostname: 'host-1' }] });
    const records = Array.from({ length: 12 }, (_unused, index) =>
      metadataHost({ endpointId: `endpoint-${index}`, fleetId: `fleet-${index}` })
    );

    installRouteResponder(context, ({ path }) => {
      if (path.startsWith('/api/endpoint/metadata')) {
        return { body: { data: records } };
      }
      if (path.startsWith('/api/fleet/agents')) {
        return { body: { items: [] } };
      }
      throw new Error(`unexpected path ${path}`);
    });

    const result = await resolveEndpointHostsStepDefinition.handler(context);

    expect(result.output!.results).toHaveLength(1);
    expect(result.output!.results[0].status).toBe('ambiguous');
    expect(result.output!.results[0].hosts).toHaveLength(10);
    expect(result.output!.results[0].truncation).toEqual({
      total: 12,
      returned: 10,
      truncated: true,
    });
  });

  it('never resolves to one host when a metadata read returns a full page', async () => {
    const context = createMockContext({ targets: [{ hostname: 'host-1' }] });
    const records = Array.from({ length: 100 }, (_unused, index) =>
      metadataHost({
        endpointId: `endpoint-${index}`,
        fleetId: `fleet-${index}`,
        hostStatus: index === 0 ? 'healthy' : 'offline',
      })
    );

    installRouteResponder(context, ({ path }) => {
      if (path.startsWith('/api/endpoint/metadata')) {
        return { body: { data: records } };
      }
      if (path.startsWith('/api/fleet/agents')) {
        return { body: { items: [] } };
      }
      throw new Error(`unexpected path ${path}`);
    });

    const result = await resolveEndpointHostsStepDefinition.handler(context);

    expect(result.output!.results).toHaveLength(1);
    expect(result.output!.results[0].status).toBe('ambiguous');
  });

  it('keeps reads, errors and records per entry, in input order', async () => {
    const metadataByAgentId = (kuery: string): MetadataHost[] =>
      kuery.includes('agent-b')
        ? [metadataHost({ endpointId: 'endpoint-b', fleetId: 'fleet-b' })]
        : [metadataHost({ endpointId: 'endpoint-a', fleetId: 'fleet-a' })];

    const context = createMockContext({
      targets: [{ agent_id: 'agent-a' }, { agent_id: 'agent-b' }],
    });
    installRouteResponder(context, ({ path }) => {
      const kuery = readQuery(path).get('kuery') ?? '';
      if (kuery.includes('agent-a')) {
        throw runawayError(403);
      }
      return { body: { data: metadataByAgentId(kuery) } };
    });

    const result = await resolveEndpointHostsStepDefinition.handler(context);
    const [first, second] = result.output!.results;

    const singleContext = createMockContext({ targets: [{ agent_id: 'agent-b' }] });
    installRouteResponder(singleContext, () => ({
      body: { data: [metadataHost({ endpointId: 'endpoint-b', fleetId: 'fleet-b' })] },
    }));
    const singleResult = await resolveEndpointHostsStepDefinition.handler(singleContext);

    expect(result.output!.results).toHaveLength(2);
    expect(first.target).toEqual({ agent_id: 'agent-a' });
    expect(first.unauthorized).toEqual(['host_state']);
    expect(first.unavailable).toEqual([]);
    expect(second.unauthorized).toEqual([]);
    expect(second).toEqual(singleResult.output!.results[0]);
  });

  it('records a non-403 read failure as unavailable for that entry only', async () => {
    const context = createMockContext({
      targets: [{ agent_id: 'agent-a' }, { agent_id: 'agent-b' }],
    });
    installRouteResponder(context, ({ path }) => {
      const kuery = readQuery(path).get('kuery') ?? '';
      if (kuery.includes('agent-a')) {
        throw runawayError(500);
      }
      return { body: { data: [metadataHost({ endpointId: 'endpoint-b', fleetId: 'fleet-b' })] } };
    });

    const result = await resolveEndpointHostsStepDefinition.handler(context);
    const [first, second] = result.output!.results;

    expect(first.status).toBe('unavailable');
    expect(first.unauthorized).toEqual([]);
    expect(first.unavailable).toEqual(['host_state']);
    expect(second.status).toBe('resolved');
    expect(second.unavailable).toEqual([]);
  });

  it('fails the step for more than ten entries before any route call', async () => {
    const context = createMockContext({
      targets: Array.from({ length: 11 }, (_unused, index) => ({ agent_id: `agent-${index}` })),
    });
    const callKibanaApi = context.contextManager.callKibanaApi as unknown as jest.Mock;

    await expect(resolveEndpointHostsStepDefinition.handler(context)).rejects.toThrow();
    expect(callKibanaApi).not.toHaveBeenCalled();
  });
});
