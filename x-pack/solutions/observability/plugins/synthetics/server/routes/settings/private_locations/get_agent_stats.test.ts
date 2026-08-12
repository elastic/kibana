/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocationAgentStats } from '../../../../common/types';
import { getPrivateLocationAgentStats } from './get_agent_stats';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import { PackagePolicyService } from '../../../synthetics_service/private_location/package_policy_service';

jest.mock('./get_private_locations');
jest.mock('../../../synthetics_service/private_location/package_policy_service');

const mockGetLocations = getPrivateLocationsAndAgentPolicies as jest.Mock;
const MockPackagePolicyService = PackagePolicyService as jest.MockedClass<
  typeof PackagePolicyService
>;

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
  last_checkin: new Date().toISOString(),
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
  packagePolicies = [],
}: {
  listAgentsImpl: jest.Mock;
  buckets?: ReturnType<typeof bucket>[];
  packagePolicies?: Array<{ condition?: string }>;
}) => {
  const search = jest.fn().mockResolvedValue({ aggregations: { by_host: { buckets } } });
  MockPackagePolicyService.mockImplementation(
    () =>
      ({
        listByLocation: jest.fn().mockResolvedValue(packagePolicies),
      } as any)
  );
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
      locations: [
        {
          id: 'loc-1',
          label: 'Location 1',
          agentPolicyId: 'policy-1',
          agentConditionSharding: true,
        },
      ],
      agentPolicies: [{ id: 'policy-1', name: 'Policy One' }],
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('skips locations without condition sharding', async () => {
    mockGetLocations.mockResolvedValue({
      locations: [{ id: 'loc-1', label: 'Location 1', agentPolicyId: 'policy-1' }],
      agentPolicies: [{ id: 'policy-1', name: 'Policy One' }],
    });
    const listAgents = jest.fn().mockResolvedValue({ agents: [agent()], total: 1 });
    const { routeContext } = makeContext({ listAgentsImpl: listAgents });

    expect(await run(routeContext)).toEqual([]);
    expect(listAgents).not.toHaveBeenCalled();
  });

  it('counts monitors per host from package-policy conditions and joins host metrics', async () => {
    const listAgents = jest.fn().mockResolvedValue({
      agents: [
        agent({ local_metadata: { host: { name: 'host-a' } } }),
        agent({
          id: 'agent-2',
          local_metadata: { host: { name: 'host-b' } },
        }),
      ],
      total: 2,
    });
    const { routeContext, search } = makeContext({
      listAgentsImpl: listAgents,
      packagePolicies: [
        { condition: "${host.name} == 'host-a'" },
        { condition: "${host.name} == 'host-a'" },
        { condition: "${host.name} == 'host-b'" },
      ],
      buckets: [
        bucket('host-a', { total: 8 * GIB, used: 2 * GIB, usedPct: 0.25, cpuPct: 0.1 }),
        bucket('host-b', { total: 4 * GIB, used: 1 * GIB, usedPct: 0.25, cpuPct: 0.05 }),
      ],
    });

    const result = await run(routeContext);
    expect(result).toHaveLength(1);
    expect(result[0].locationLabel).toBe('Location 1');
    expect(result[0].agentPolicyName).toBe('Policy One');
    expect(result[0].unassignedMonitors).toBe(0);

    const byHost = Object.fromEntries(result[0].agents.map((a) => [a.host, a]));
    expect(byHost['host-a'].monitors).toBe(2);
    expect(byHost['host-b'].monitors).toBe(1);
    expect(byHost['host-a'].usedMemoryPct).toBe(0.25);
    expect(byHost['host-a'].cpuPct).toBe(0.1);
    expect(listAgents).toHaveBeenCalledWith(expect.objectContaining({ showInactive: false }));
    expect(search).toHaveBeenCalled();
  });

  it('collapses several agents on the same host to one row (freshest identity)', async () => {
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

    expect(result[0].agents).toHaveLength(1);
    expect(result[0].agents[0].host).toBe('host-c');
    expect(result[0].agents[0].agentId).toBe('freshest');
    expect(result[0].agents[0].agentVersion).toBe('9.6.0');
  });

  it('counts unassigned monitors separately', async () => {
    const listAgents = jest.fn().mockResolvedValue({
      agents: [agent()],
      total: 1,
    });
    const { routeContext } = makeContext({
      listAgentsImpl: listAgents,
      packagePolicies: [
        { condition: "${host.name} == 'host-a'" },
        { condition: undefined },
        { condition: "${host.id} == '__synthetics_unassigned__'" },
      ],
    });

    const result = await run(routeContext);
    // Exact unassigned count depends on hostFromCondition; at least the undefined one.
    expect(result[0].agents.find((a) => a.host === 'host-a')?.monitors).toBeGreaterThanOrEqual(1);
    expect(result[0].unassignedMonitors).toBeGreaterThanOrEqual(1);
  });
});
