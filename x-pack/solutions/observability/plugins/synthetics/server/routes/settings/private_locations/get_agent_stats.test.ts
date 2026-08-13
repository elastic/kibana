/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocationAgentStats } from '../../../../common/types';
import { getPrivateLocationAgentStats } from './get_agent_stats';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';

jest.mock('./get_private_locations');

const mockGetLocations = getPrivateLocationsAndAgentPolicies as jest.Mock;

const GIB = 1024 * 1024 * 1024;

interface FakeAgent {
  id?: string;
  status?: string;
  last_checkin?: string;
  last_checkin_message?: string;
  policy_revision?: number;
  tags?: string[];
  local_metadata?: {
    host?: { name?: string; hostname?: string; memory?: number };
    os?: { platform?: string };
    elastic?: { agent?: { version?: string } };
  };
}

const agent = (over: FakeAgent = {}): FakeAgent => ({
  id: 'agent-1',
  status: 'online',
  last_checkin: '2026-08-01T00:00:00.000Z',
  last_checkin_message: 'Running',
  policy_revision: 6,
  tags: [],
  local_metadata: {
    host: { name: 'host-a' },
    os: { platform: 'linux' },
    elastic: { agent: { version: '9.6.0' } },
  },
  ...over,
});

const bucket = (
  key: string,
  {
    total,
    used,
    usedPct,
    cpuPct,
  }: { total?: number; used?: number; usedPct?: number; cpuPct?: number }
) => ({
  key,
  total: { value: total ?? null },
  used: { value: used ?? null },
  usedPct: { value: usedPct ?? null },
  cpuPct: { value: cpuPct ?? null },
});

const makeContext = ({
  listAgentsImpl,
  buckets = [],
}: {
  listAgentsImpl: jest.Mock;
  buckets?: ReturnType<typeof bucket>[];
}) => {
  const search = jest.fn().mockResolvedValue({ aggregations: { by_host: { buckets } } });
  const routeContext = {
    server: { fleet: { agentService: { asInternalUser: { listAgents: listAgentsImpl } } } },
    context: {
      core: Promise.resolve({ elasticsearch: { client: { asCurrentUser: { search } } } }),
    },
    savedObjectsClient: {},
    syntheticsMonitorClient: {},
  } as any;
  return { routeContext, search };
};

const run = async (routeContext: any): Promise<LocationAgentStats[]> => {
  const result = await getPrivateLocationAgentStats().handler(routeContext);
  if (!Array.isArray(result)) {
    throw new Error('Expected LocationAgentStats[] from handler');
  }
  return result;
};

describe('getPrivateLocationAgentStats route', () => {
  beforeEach(() => {
    mockGetLocations.mockResolvedValue({
      locations: [{ id: 'loc-1', label: 'Location 1', agentPolicyId: 'policy-1' }],
      agentPolicies: [{ id: 'policy-1', name: 'Policy One' }],
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('joins metrics for mixed-case host names (queries original case, keys result lowercase)', async () => {
    const listAgents = jest.fn().mockResolvedValue({
      agents: [agent({ local_metadata: { host: { name: 'WIN-Server01' } } })],
      total: 1,
    });
    const { routeContext, search } = makeContext({
      listAgentsImpl: listAgents,
      buckets: [
        bucket('WIN-Server01', { total: 8 * GIB, used: 2 * GIB, usedPct: 0.25, cpuPct: 0.1 }),
      ],
    });

    const result = await run(routeContext);
    const agentStat = result[0].agents[0];

    expect(agentStat.host).toBe('WIN-Server01');
    expect(agentStat.agentId).toBe('agent-1');
    expect(agentStat.usedMemoryPct).toBe(0.25);
    expect(agentStat.cpuPct).toBe(0.1);
    expect(listAgents).toHaveBeenCalledWith(expect.objectContaining({ showInactive: true }));

    const query = search.mock.calls[0][0].query;
    const termsFilter = query.bool.filter.find((f: any) => f.terms?.['host.name']);
    expect(termsFilter.terms['host.name']).toEqual(['WIN-Server01']);
  });

  it('caps usedMemoryMib at totalMemoryMib', async () => {
    const listAgents = jest.fn().mockResolvedValue({
      agents: [agent({ local_metadata: { host: { name: 'host-a', memory: 4 * GIB } } })],
      total: 1,
    });
    const { routeContext } = makeContext({
      listAgentsImpl: listAgents,
      buckets: [bucket('host-a', { used: 6 * GIB, usedPct: 0.99 })],
    });

    const result = await run(routeContext);
    const agentStat = result[0].agents[0];

    expect(agentStat.totalMemoryMib).toBe(4 * 1024);
    expect(agentStat.usedMemoryMib).toBe(4 * 1024); // capped, not 6144
  });

  it('returns one row per agent id when several agents share a host name', async () => {
    const listAgents = jest.fn().mockResolvedValue({
      agents: [
        agent({
          id: 'stale',
          last_checkin: '2026-08-01T00:00:00.000Z',
          local_metadata: {
            host: { name: 'host-c' },
            elastic: { agent: { version: '9.5.0' } },
          },
        }),
        agent({
          id: 'freshest',
          last_checkin: '2026-08-02T12:00:00.000Z',
          local_metadata: {
            host: { name: 'host-c' },
            elastic: { agent: { version: '9.6.0' } },
          },
        }),
      ],
      total: 2,
    });
    const { routeContext } = makeContext({ listAgentsImpl: listAgents });

    const result = await run(routeContext);

    expect(result[0].agents).toHaveLength(2);
    expect(result[0].agents.map((a) => a.agentId).sort()).toEqual(['freshest', 'stale']);
    expect(result[0].agents.every((a) => a.host === 'host-c')).toBe(true);
  });

  it('paginates using the reported total across multiple pages', async () => {
    const listAgents = jest
      .fn()
      .mockResolvedValueOnce({
        agents: [
          agent({ id: 'a', local_metadata: { host: { name: 'host-a' } } }),
          agent({ id: 'b', local_metadata: { host: { name: 'host-b' } } }),
        ],
        total: 3,
      })
      .mockResolvedValueOnce({
        agents: [agent({ id: 'c', local_metadata: { host: { name: 'host-c' } } })],
        total: 3,
      });
    const { routeContext } = makeContext({ listAgentsImpl: listAgents });

    const result = await run(routeContext);

    expect(listAgents).toHaveBeenCalledTimes(2);
    expect(result[0].agents.map((a) => a.agentId).sort()).toEqual(['a', 'b', 'c']);
  });

  it('resolves the agent policy display name', async () => {
    const listAgents = jest.fn().mockResolvedValue({ agents: [agent()], total: 1 });
    const { routeContext } = makeContext({ listAgentsImpl: listAgents });

    const result = await run(routeContext);

    expect(result[0].agentPolicyName).toBe('Policy One');
    expect(result[0].locationLabel).toBe('Location 1');
  });
});
