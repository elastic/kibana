/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { buildPolicyIdsOrVariantsKuery } from '@kbn/fleet-plugin/common';
import { FleetUnauthorizedError } from '@kbn/fleet-plugin/server';
import {
  type getEndpointInventoryCountsInputSchema,
  getEndpointInventoryCountsOutputSchema,
} from '../../../../../../common/workflows/step_types/endpoint/hosts';
import { createGetEndpointInventoryCountsStepDefinition } from '.';

const isCcsEnabled = jest.fn().mockResolvedValue(false);
const listAgents = jest.fn();
const asScoped = jest.fn().mockReturnValue({ listAgents });
const getFleetAgentService = jest.fn().mockReturnValue({ asScoped });
const closePointInTime = jest.fn();
const getInternalEsClient = jest.fn().mockReturnValue({ closePointInTime });
const getEndpointInventoryCountsStepDefinition = createGetEndpointInventoryCountsStepDefinition({
  isCcsEnabled,
  getFleetAgentService,
  getInternalEsClient,
});

type InventoryContext = StepHandlerContext<typeof getEndpointInventoryCountsInputSchema>;

const createContext = (callKibanaApi: jest.Mock, esSearch: jest.Mock): InventoryContext =>
  ({
    input: {},
    abortSignal: new AbortController().signal,
    contextManager: {
      callKibanaApi,
      getScopedEsClient: jest.fn().mockReturnValue({ search: esSearch }),
      getFakeRequest: jest.fn().mockReturnValue(httpServerMock.createKibanaRequest()),
      getContext: jest.fn(),
      renderInputTemplate: jest.fn(),
    },
  } as unknown as InventoryContext);

const metadataSearchResponse = (count: number) => ({
  hits: { total: { value: count, relation: 'eq' }, hits: [] },
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  timed_out: false,
});

const readQuery = (path: string): URLSearchParams => new URL(`http://kibana${path}`).searchParams;

const run = async (callKibanaApi: jest.Mock, esSearch: jest.Mock) => {
  const result = await getEndpointInventoryCountsStepDefinition.handler(
    createContext(callKibanaApi, esSearch)
  );
  expect(getEndpointInventoryCountsOutputSchema.safeParse(result.output).success).toBe(true);
  return result.output!;
};

describe('getEndpointInventoryCountsStepDefinition', () => {
  beforeEach(() => {
    isCcsEnabled.mockReset().mockResolvedValue(false);
    closePointInTime.mockReset().mockResolvedValue({ succeeded: true, num_freed: 1 });
    listAgents.mockReset().mockResolvedValue({
      agents: [{ id: 'agent-1', policy_id: 'agent-policy-0' }],
      total: 1,
      pit: 'pit-1',
    });
  });

  const packagePoliciesRoute = (
    items: Array<{ id?: string; policy_ids?: string[]; agents?: number }>,
    total: number = items.length
  ) => ({
    status: 200,
    headers: {},
    body: {
      items: items.map((item, index) => ({
        id: `policy-${index}`,
        policy_ids: [`agent-policy-${index}`],
        ...item,
      })),
      total,
    },
  });

  it.each([false, true])('returns the three counts with CCS enabled: %s', async (ccsEnabled) => {
    isCcsEnabled.mockResolvedValue(ccsEnabled);
    const callKibanaApi = jest
      .fn()
      .mockImplementation(async ({ path }: { path: string }) =>
        path.startsWith('/api/fleet/package_policies')
          ? packagePoliciesRoute([{ agents: 4 }])
          : { status: 200, headers: {}, body: { total: 6 } }
      );
    const esSearch = jest.fn().mockResolvedValue(metadataSearchResponse(9));
    closePointInTime.mockRejectedValueOnce(new Error('PIT expired'));

    const output = await run(callKibanaApi, esSearch);

    expect(closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
    expect(output.fleet_agent_count).toBe(4);
    expect(output.united_metadata_count).toBe(6);
    expect(output.current_metadata_count).toBe(9);
    expect(esSearch).toHaveBeenCalledWith(
      {
        index: ccsEnabled
          ? 'metrics-endpoint.metadata_current_*,*:metrics-endpoint.metadata_current_*'
          : 'metrics-endpoint.metadata_current_*',
        size: 0,
        track_total_hits: true,
        allow_no_indices: false,
        query: {
          bool: {
            should: [
              { terms: { 'elastic.agent.id': ['agent-1'] } },
              {
                bool: {
                  must_not: { exists: { field: 'elastic.agent.id' } },
                  filter: { terms: { 'agent.id': ['agent-1'] } },
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      },
      { signal: expect.any(AbortSignal) }
    );
    expect(output.unauthorized).toEqual([]);
    expect(output.unavailable).toEqual([]);
  });

  it.each([
    { failure: 'failed shards', response: { _shards: { failed: 1 } } },
    { failure: 'timeout', response: { timed_out: true } },
    { failure: 'skipped cluster', response: { _clusters: { skipped: 1 } } },
    { failure: 'partial cluster', response: { _clusters: { partial: 1 } } },
    { failure: 'failed cluster', response: { _clusters: { failed: 1 } } },
    { failure: 'missing index', response: undefined },
  ])('omits the current count and preserves other counts for $failure', async ({ response }) => {
    const callKibanaApi = jest
      .fn()
      .mockImplementation(async ({ path }: { path: string }) =>
        path.startsWith('/api/fleet/package_policies')
          ? packagePoliciesRoute([{ agents: 4 }])
          : { status: 200, headers: {}, body: { total: 6 } }
      );
    const esSearch = jest.fn();
    if (response) {
      esSearch.mockResolvedValue({ ...metadataSearchResponse(9), ...response });
    } else {
      esSearch.mockRejectedValue({
        meta: { statusCode: 404 },
        body: { error: { type: 'index_not_found_exception' } },
      });
    }

    const output = await run(callKibanaApi, esSearch);

    expect(output.current_metadata_count).toBeUndefined();
    expect(output.unavailable).toEqual(['current_metadata_count']);
    expect(output.unauthorized).toEqual([]);
    expect(output.fleet_agent_count).toBe(4);
    expect(output.united_metadata_count).toBe(6);
  });

  it.each(['stable', 'missing policy', 'repeated policy', 'deleted policy'])(
    'counts unique integration policies across pages (%s)',
    async (scenario) => {
      const firstPage = Array.from({ length: 100 }, () => ({ agents: 1 }));
      const lastPage = [
        {
          id: scenario === 'stable' || scenario === 'deleted policy' ? 'policy-100' : 'policy-99',
          agents: 1,
        },
        { id: 'policy-101', agents: 1 },
      ];
      const callKibanaApi = jest.fn().mockImplementation(async ({ path }: { path: string }) => {
        if (path.startsWith('/api/fleet/package_policies')) {
          return readQuery(path).get('page') === '2'
            ? packagePoliciesRoute(
                lastPage,
                scenario === 'repeated policy' || scenario === 'deleted policy' ? 101 : 102
              )
            : packagePoliciesRoute(firstPage, 102);
        }
        return { status: 200, headers: {}, body: { total: 6 } };
      });
      const esSearch = jest.fn().mockResolvedValue(metadataSearchResponse(9));

      const output = await run(callKibanaApi, esSearch);

      const incomplete = scenario === 'missing policy' || scenario === 'deleted policy';
      expect(output.fleet_agent_count).toBe(
        incomplete ? undefined : scenario === 'stable' ? 102 : 101
      );
      expect(output.unavailable).toEqual(
        incomplete ? ['fleet_agent_count', 'current_metadata_count'] : []
      );
      if (incomplete) {
        expect(listAgents).not.toHaveBeenCalled();
      }
      const packagePolicyCalls = callKibanaApi.mock.calls
        .map(([params]) => params as { path: string })
        .filter((params) => params.path.startsWith('/api/fleet/package_policies'));
      expect(packagePolicyCalls).toHaveLength(2);
      for (const { path } of packagePolicyCalls) {
        expect(readQuery(path).get('kuery')).toBe('fleet-package-policies.package.name:endpoint');
        expect(readQuery(path).get('withAgentCount')).toBe('true');
      }
    }
  );

  it('omits fleet and current metadata counts when the package policy walk reaches its cap', async () => {
    const callKibanaApi = jest.fn().mockImplementation(async ({ path }: { path: string }) =>
      path.startsWith('/api/fleet/package_policies')
        ? packagePoliciesRoute(
            Array.from({ length: 100 }, () => ({ agents: 1 })),
            10001
          )
        : { status: 200, headers: {}, body: { total: 6 } }
    );

    const esSearch = jest.fn().mockResolvedValue(metadataSearchResponse(9));
    const output = await run(callKibanaApi, esSearch);

    expect(output.fleet_agent_count).toBeUndefined();
    expect(output.unavailable).toEqual(['fleet_agent_count', 'current_metadata_count']);
    expect(output.unauthorized).toEqual([]);
    expect(output.united_metadata_count).toBe(6);
    expect(output.current_metadata_count).toBeUndefined();
    expect(esSearch).not.toHaveBeenCalled();
    const pages = callKibanaApi.mock.calls
      .map(([{ path }]) => path as string)
      .filter((path) => path.startsWith('/api/fleet/package_policies'));
    expect(pages).toHaveLength(100);
    expect(readQuery(pages[99]).get('page')).toBe('100');
    expect(readQuery(pages[99]).get('perPage')).toBe('100');
  });

  it.each([0, 403, 500])(
    'does not read current metadata for an empty or failed policy read (%s)',
    async (status) => {
      const callKibanaApi = jest.fn().mockImplementation(async ({ path }: { path: string }) => {
        if (path.startsWith('/api/fleet/package_policies')) {
          if (status !== 0) {
            throw Object.assign(new Error('Policy read failed'), { meta: { statusCode: status } });
          }
          return packagePoliciesRoute([]);
        }
        return { status: 200, headers: {}, body: { total: 6 } };
      });
      const esSearch = jest.fn();
      const context = createContext(callKibanaApi, esSearch);
      const result = await getEndpointInventoryCountsStepDefinition.handler(context);
      const output = result.output!;

      expect(listAgents).not.toHaveBeenCalled();
      expect(esSearch).not.toHaveBeenCalled();
      expect(output.current_metadata_count).toBe(status === 0 ? 0 : undefined);
      expect(output.fleet_agent_count).toBe(status === 0 ? 0 : undefined);
      expect(output.unauthorized).toEqual(
        status === 403 ? ['fleet_agent_count', 'current_metadata_count'] : []
      );
      expect(output.unavailable).toEqual(
        status === 500 ? ['fleet_agent_count', 'current_metadata_count'] : []
      );
      expect(output.united_metadata_count).toBe(6);
    }
  );

  it('counts each page and shares the latest PIT across policy batches', async () => {
    const policyIds = Array.from({ length: 501 }, (_, index) => `agent-policy-${index}`);
    const callKibanaApi = jest
      .fn()
      .mockImplementation(async ({ path }: { path: string }) =>
        path.startsWith('/api/fleet/package_policies')
          ? packagePoliciesRoute([{ agents: 1002, policy_ids: [...policyIds, policyIds[0]] }])
          : { body: { total: 6 } }
      );
    const firstAgents = Array.from({ length: 1000 }, (_, index) => ({
      id: `agent-${index}`,
      sort: [index, `agent-${index}`],
    }));
    listAgents
      .mockResolvedValueOnce({ agents: firstAgents, total: 1001, pit: 'pit-1' })
      .mockResolvedValueOnce({
        agents: [{ id: 'unenrolled-agent', sort: [1000, 'unenrolled-agent'] }],
        total: 9999,
        pit: 'pit-2',
      })
      .mockResolvedValueOnce({
        agents: [{ id: 'variant-policy-agent', sort: [1001, 'variant-policy-agent'] }],
        total: 1,
        pit: 'pit-3',
      });
    const esSearch = jest
      .fn()
      .mockResolvedValueOnce(metadataSearchResponse(997))
      .mockResolvedValueOnce(metadataSearchResponse(2))
      .mockResolvedValueOnce(metadataSearchResponse(1));
    const context = createContext(callKibanaApi, esSearch);

    const { output } = await getEndpointInventoryCountsStepDefinition.handler(context);

    expect(output!.current_metadata_count).toBe(1000);
    expect(output!.unavailable).toEqual([]);
    expect(asScoped).toHaveBeenCalledWith(context.contextManager.getFakeRequest());
    const options = {
      showInactive: true,
      perPage: 1000,
      pitKeepAlive: '1m',
      kuery: `status:* and ${buildPolicyIdsOrVariantsKuery(policyIds.slice(0, 500))}`,
    };
    expect(listAgents.mock.calls).toEqual([
      [{ ...options, openPit: true }],
      [{ ...options, pitId: 'pit-1', searchAfter: [999, 'agent-999'] }],
      [
        {
          ...options,
          kuery: `status:* and ${buildPolicyIdsOrVariantsKuery(policyIds.slice(500))}`,
          pitId: 'pit-2',
        },
      ],
    ]);
    expect(closePointInTime).toHaveBeenCalledTimes(1);
    expect(closePointInTime).toHaveBeenCalledWith({ id: 'pit-3' });
    expect(esSearch).toHaveBeenCalledTimes(3);
    for (const [pageIndex, ids] of [
      firstAgents.map(({ id }) => id),
      ['unenrolled-agent'],
      ['variant-policy-agent'],
    ].entries()) {
      expect(esSearch.mock.calls[pageIndex][0].query.bool.should[0]).toEqual({
        terms: { 'elastic.agent.id': ids },
      });
    }
  });

  it.each([
    403,
    500,
    'FleetUnauthorizedError',
    'cap',
    'missing PIT',
    'missing cursor',
    'empty page',
  ])('omits the current count instead of counting a partial Fleet read (%s)', async (failure) => {
    const callKibanaApi = jest
      .fn()
      .mockImplementation(async ({ path }: { path: string }) =>
        path.startsWith('/api/fleet/package_policies')
          ? packagePoliciesRoute([{ agents: 1 }])
          : { body: { total: 6 } }
      );
    listAgents.mockImplementation(async () => {
      if (typeof failure === 'number') {
        throw Object.assign(new Error('Fleet read failed'), { statusCode: failure });
      }
      if (failure === 'FleetUnauthorizedError') {
        throw new FleetUnauthorizedError('Fleet read denied');
      }
      return {
        agents:
          failure === 'empty page'
            ? []
            : [{ id: 'agent-1', ...(failure !== 'missing cursor' ? { sort: [1] } : {}) }],
        total: failure === 'cap' ? 1_000_001 : 2,
        ...(failure !== 'missing PIT' ? { pit: 'pit-1' } : {}),
      };
    });
    const esSearch = jest.fn();
    const output = await run(callKibanaApi, esSearch);

    expect(output.current_metadata_count).toBeUndefined();
    expect(output.fleet_agent_count).toBe(1);
    expect(output.united_metadata_count).toBe(6);
    const unauthorized = failure === 403 || failure === 'FleetUnauthorizedError';
    expect(output.unauthorized).toEqual(unauthorized ? ['current_metadata_count'] : []);
    expect(output.unavailable).toEqual(unauthorized ? [] : ['current_metadata_count']);
    expect(esSearch).not.toHaveBeenCalled();
    expect(listAgents).toHaveBeenCalledTimes(1);
    if (['cap', 'missing cursor', 'empty page'].includes(String(failure))) {
      expect(closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
    } else {
      expect(closePointInTime).not.toHaveBeenCalled();
    }
  });

  it('counts an inventory larger than 10,000 agents with page-local metadata queries', async () => {
    const callKibanaApi = jest
      .fn()
      .mockImplementation(async ({ path }: { path: string }) =>
        path.startsWith('/api/fleet/package_policies')
          ? packagePoliciesRoute([{ agents: 10001 }])
          : { body: { total: 6 } }
      );
    let offset = 0;
    listAgents.mockImplementation(async () => {
      const agents = Array.from({ length: Math.min(1000, 10001 - offset) }, (_, index) => ({
        id: `agent-${offset + index}`,
        sort: [offset + index],
      }));
      offset += agents.length;
      return { agents, total: 10001, pit: `pit-${offset}` };
    });
    const esSearch = jest
      .fn()
      .mockImplementation(async ({ query }) =>
        metadataSearchResponse(query.bool.should[0].terms['elastic.agent.id'].length)
      );

    const output = await run(callKibanaApi, esSearch);

    expect(output.current_metadata_count).toBe(10001);
    expect(output.unavailable).toEqual([]);
    expect(listAgents).toHaveBeenCalledTimes(11);
    expect(esSearch).toHaveBeenCalledTimes(11);
    expect(
      esSearch.mock.calls.map(
        ([request]) => request.query.bool.should[0].terms['elastic.agent.id'].length
      )
    ).toEqual([...Array(10).fill(1000), 1]);
  });

  it('enforces the combined snapshot total before walking the next batch', async () => {
    const callKibanaApi = jest.fn().mockImplementation(async ({ path }: { path: string }) =>
      path.startsWith('/api/fleet/package_policies')
        ? packagePoliciesRoute([
            {
              agents: 1,
              policy_ids: Array.from({ length: 501 }, (_, index) => `policy-${index}`),
            },
          ])
        : { body: { total: 6 } }
    );
    listAgents
      .mockResolvedValueOnce({ agents: [{ id: 'agent-1' }], total: 1, pit: 'pit-1' })
      .mockResolvedValueOnce({
        agents: [{ id: 'agent-2', sort: [2] }],
        total: 1_000_000,
        pit: 'pit-2',
      });
    const esSearch = jest.fn().mockResolvedValue(metadataSearchResponse(1));

    const output = await run(callKibanaApi, esSearch);

    expect(output.current_metadata_count).toBeUndefined();
    expect(output.unavailable).toEqual(['current_metadata_count']);
    expect(listAgents).toHaveBeenCalledTimes(2);
    expect(esSearch).toHaveBeenCalledTimes(1);
  });

  it('stops after an in-progress Fleet read is aborted without returning a caveat', async () => {
    const controller = new AbortController();
    const callKibanaApi = jest
      .fn()
      .mockImplementation(async ({ path }: { path: string }) =>
        path.startsWith('/api/fleet/package_policies')
          ? packagePoliciesRoute([{ agents: 1 }])
          : { body: { total: 6 } }
      );
    listAgents.mockImplementation(async () => {
      controller.abort();
      return { agents: [{ id: 'agent-1' }], total: 1, pit: 'pit-1' };
    });
    const esSearch = jest.fn();
    const context = createContext(callKibanaApi, esSearch);
    context.abortSignal = controller.signal;

    await expect(getEndpointInventoryCountsStepDefinition.handler(context)).rejects.toThrow();
    expect(listAgents).toHaveBeenCalledTimes(1);
    expect(closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
    expect(esSearch).not.toHaveBeenCalled();
  });

  it('stops an aborted inventory read rather than returning a caveat', async () => {
    const controller = new AbortController();
    const callKibanaApi = jest.fn().mockImplementation(() => {
      controller.abort();
      throw controller.signal.reason;
    });
    const esSearch = jest.fn();
    const context = createContext(callKibanaApi, esSearch);
    context.abortSignal = controller.signal;

    await expect(getEndpointInventoryCountsStepDefinition.handler(context)).rejects.toThrow();
    expect(esSearch).not.toHaveBeenCalled();
  });

  it('omits current_metadata_count and marks it unauthorized on an ES security exception', async () => {
    const callKibanaApi = jest
      .fn()
      .mockImplementation(async ({ path }: { path: string }) =>
        path.startsWith('/api/fleet/package_policies')
          ? packagePoliciesRoute([{ agents: 4 }])
          : { status: 200, headers: {}, body: { total: 4 } }
      );
    const esSearch = jest.fn().mockRejectedValue({
      meta: { statusCode: 403 },
      body: { error: { type: 'security_exception' } },
    });

    const output = await run(callKibanaApi, esSearch);

    expect(output.current_metadata_count).toBeUndefined();
    expect(output.unauthorized).toEqual(['current_metadata_count']);
    expect(closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
    expect(output.fleet_agent_count).toBe(4);
    expect(output.united_metadata_count).toBe(4);
  });
});
