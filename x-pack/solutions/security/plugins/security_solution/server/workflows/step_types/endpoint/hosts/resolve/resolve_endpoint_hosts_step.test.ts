/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { createResolveEndpointHostsStepDefinition } from './resolve_endpoint_hosts_step';

type MetadataHost = Record<string, unknown>;

const endpointAppContextServiceMock = (policyIds: string[][]): EndpointAppContextService =>
  ({
    getEndpointMetadataService: jest.fn().mockReturnValue({
      getAllEndpointPackagePolicies: jest
        .fn()
        .mockResolvedValue(policyIds.map((ids) => ({ policy_ids: ids }))),
    }),
  } as unknown as EndpointAppContextService);

const createStep = (policyIds: string[][] = []) =>
  createResolveEndpointHostsStepDefinition({
    endpointAppContextService: endpointAppContextServiceMock(policyIds),
  });

const createMockContext = (rawInput: Record<string, unknown>) =>
  ({
    input: rawInput,
    config: {},
    rawInput,
    contextManager: {
      getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'default' } }),
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
  const resolveEndpointHostsStepDefinition = createStep();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses metadata only without reading Fleet when the Defend policy read fails', async () => {
    const context = createMockContext({ targets: [{ hostname: 'host-1' }] });
    const readPolicies = jest.fn().mockRejectedValue(runawayError(500));
    const service = endpointAppContextServiceMock([]);
    jest.mocked(service.getEndpointMetadataService).mockReturnValue({
      getAllEndpointPackagePolicies: readPolicies,
    } as unknown as ReturnType<EndpointAppContextService['getEndpointMetadataService']>);
    const callKibanaApi = installRouteResponder(context, ({ path }) => {
      if (path.startsWith('/api/endpoint/metadata')) {
        return {
          body: {
            data: [metadataHost({ endpointId: 'endpoint-1', fleetId: 'metadata-host' })],
          },
        };
      }
      return {
        body: {
          items: [{ id: 'fleet-only', status: 'online', policy_id: 'policy-defend' }],
        },
      };
    });

    const result = await createResolveEndpointHostsStepDefinition({
      endpointAppContextService: service,
    }).handler(context);

    expect(result.output!.results[0].status).toBe('resolved');
    expect(result.output!.results[0].hosts.map((host) => host.agent_id)).toEqual(['metadata-host']);
    expect(result.output!.results[0].unauthorized).toEqual([]);
    expect(result.output!.results[0].unavailable).toEqual(['host_enrollments']);
    expect(readPolicies).toHaveBeenCalledTimes(1);
    expect(callKibanaApi).toHaveBeenCalledTimes(1);
    expect(callKibanaApi.mock.calls[0][0].path).toMatch(/^\/api\/endpoint\/metadata\?/);
  });

  it('resolves by hostname when the agent id is empty or whitespace only', async () => {
    for (const agentId of ['', '   ']) {
      const target = { hostname: 'host-1', agent_id: agentId };
      const context = createMockContext({ targets: [target] });
      installRouteResponder(context, ({ path }) => {
        if (path.startsWith('/api/endpoint/metadata')) {
          const kuery = readQuery(path).get('kuery');
          expect(kuery).toBe(
            'united.endpoint.host.hostname:"host-1" or united.agent.local_metadata.host.name.keyword:"host-1"'
          );
          return {
            body: { data: [metadataHost({ endpointId: 'endpoint-1', fleetId: 'fleet-1' })] },
          };
        }
        return { body: { items: [] } };
      });

      const result = await createStep().handler(context);

      expect(result.output!.results[0].status).toBe('resolved');
      expect(result.output!.results[0].hosts[0].agent_id).toBe('fleet-1');
      expect(result.output!.results[0].target).toEqual(target);
    }
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

  it('keeps a Fleet-only agent in an Elastic Defend agent policy, including a version-suffixed policy id', async () => {
    const context = createMockContext({ targets: [{ hostname: 'host-1' }] });
    const fleetAgent = (id: string, policyId: string) => ({
      id,
      status: 'online',
      active: true,
      enrolled_at: '2024-01-01T00:00:00.000Z',
      policy_id: policyId,
      local_metadata: { host: { hostname: 'host-1', name: 'host-1' } },
    });

    installRouteResponder(context, ({ path }) => {
      if (path.startsWith('/api/endpoint/metadata')) {
        return { body: { data: [] } };
      }
      if (path.startsWith('/api/fleet/agents')) {
        return {
          body: {
            items: [
              fleetAgent('fleet-plain', 'policy-defend'),
              fleetAgent('fleet-suffixed', 'policy-defend#9.2'),
            ],
          },
        };
      }
      throw new Error(`unexpected path ${path}`);
    });

    const step = createStep([['policy-defend']]);
    const result = await step.handler(context);

    const fleetSearchPath = (
      context.contextManager.callKibanaApi as unknown as jest.Mock
    ).mock.calls
      .map(([params]) => params as { path: string })
      .find((params) => params.path.startsWith('/api/fleet/agents'))!.path;
    expect(readQuery(fleetSearchPath).get('kuery')).toBe(
      'status:* and local_metadata.host.name.keyword:"host-1"'
    );

    expect(result.output!.results[0].status).toBe('ambiguous');
    expect(result.output!.results[0].hosts).toHaveLength(2);
    expect(result.output!.results[0].hosts.map((host) => host.agent_id).sort()).toEqual([
      'fleet-plain',
      'fleet-suffixed',
    ]);
    expect(result.output!.results[0].unavailable).toEqual([]);
    expect(result.output!.results[0].unauthorized).toEqual([]);
  });

  it('resolves a Defend agent on page 2 after a full page of non-Defend Fleet agents', async () => {
    const context = createMockContext({ targets: [{ hostname: 'host-1' }] });
    const pages: number[] = [];
    installRouteResponder(context, ({ path }) => {
      if (path.startsWith('/api/endpoint/metadata')) {
        return { body: { data: [] } };
      }
      const query = readQuery(path);
      const page = Number(query.get('page'));
      pages.push(page);
      expect(query.get('perPage')).toBe('100');
      return {
        body: {
          total: 101,
          items:
            page === 1
              ? Array.from({ length: 100 }, (_unused, index) => ({
                  id: `other-${index}`,
                  status: 'online',
                  policy_id: 'policy-other',
                }))
              : [{ id: 'fleet-defend', status: 'online', policy_id: 'policy-defend' }],
        },
      };
    });

    const service = endpointAppContextServiceMock([['policy-defend']]);
    const result = await createResolveEndpointHostsStepDefinition({
      endpointAppContextService: service,
    }).handler(context);

    expect(
      service.getEndpointMetadataService('default').getAllEndpointPackagePolicies
    ).toHaveBeenCalledTimes(1);
    expect(pages).toEqual([1, 2]);
    expect(result.output!.results[0].status).toBe('resolved');
    expect(result.output!.results[0].hosts.map((host) => host.agent_id)).toEqual(['fleet-defend']);
    expect(result.output!.results[0].truncation).toEqual({
      total: 1,
      returned: 1,
      truncated: false,
    });
  });

  it.each([false, true])(
    'resolves short-hostname expansion after a full non-Defend Fleet page (full exact metadata: %s)',
    async (fullExactMetadata) => {
      const context = createMockContext({
        targets: [{ hostname: 'host-1' }],
        expand_short_hostname: true,
      });
      const fqdnHost = metadataHost({
        endpointId: 'endpoint-fqdn',
        fleetId: 'host-1.example.com',
      });
      const pages: number[] = [];
      installRouteResponder(context, ({ path }) => {
        const query = readQuery(path);
        if (path.startsWith('/api/endpoint/metadata')) {
          const expanded = query.get('kuery') === 'united.endpoint.host.hostname:host-1.*';
          return {
            body: {
              data: expanded
                ? [fqdnHost]
                : fullExactMetadata
                ? Array.from({ length: 100 }, () => ({}))
                : [],
            },
          };
        }
        const page = Number(query.get('page'));
        pages.push(page);
        return {
          body: {
            total: 100,
            items: Array.from({ length: 100 }, (_unused, index) => ({
              id: `other-${index}`,
              status: 'online',
              policy_id: 'policy-other',
            })),
          },
        };
      });

      const result = await createStep([['policy-defend']]).handler(context);

      expect(pages).toEqual([1]);
      expect(result.output!.results[0].status).toBe('resolved');
      expect(result.output!.results[0].hosts[0].metadata?.host.hostname).toBe('host-1.example.com');
      expect(result.output!.results[0].truncation).toEqual({
        total: 1,
        returned: 1,
        truncated: false,
      });
    }
  );

  it('keeps a single visible Defend host ambiguous when the Fleet walk reaches its page cap', async () => {
    const context = createMockContext({ targets: [{ hostname: 'host-1' }] });
    const pages: number[] = [];
    installRouteResponder(context, ({ path }) => {
      if (path.startsWith('/api/endpoint/metadata')) {
        return { body: { data: [] } };
      }
      const page = Number(readQuery(path).get('page'));
      pages.push(page);
      return {
        body: {
          total: 1001,
          items: Array.from({ length: 100 }, (_unused, index) => ({
            id: `fleet-${page}-${index}`,
            status: 'online',
            policy_id: page === 1 && index === 0 ? 'policy-defend' : 'policy-other',
          })),
        },
      };
    });

    const result = await createStep([['policy-defend']]).handler(context);

    expect(pages).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.output!.results[0].status).toBe('ambiguous');
    expect(result.output!.results[0].hosts.map((host) => host.agent_id)).toEqual(['fleet-1-0']);
    expect(result.output!.results[0].truncation).toEqual({
      total: 1,
      returned: 1,
      truncated: false,
    });
  });

  it('drops a Fleet-only agent that is not in an Elastic Defend agent policy', async () => {
    const context = createMockContext({ targets: [{ hostname: 'host-1' }] });

    installRouteResponder(context, ({ path }) => {
      if (path.startsWith('/api/endpoint/metadata')) {
        return { body: { data: [] } };
      }
      if (path.startsWith('/api/fleet/agents')) {
        return {
          body: {
            items: [
              { id: 'fleet-other', status: 'online', active: true, policy_id: 'policy-other' },
            ],
          },
        };
      }
      throw new Error(`unexpected path ${path}`);
    });

    const step = createStep([['policy-defend']]);
    const result = await step.handler(context);

    expect(result.output!.results[0].status).toBe('not_found');
    expect(result.output!.results[0].hosts).toEqual([]);
    expect(result.output!.results[0].unavailable).toEqual([]);
    expect(result.output!.results[0].unauthorized).toEqual([]);
  });
});
