/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { SyntheticsServerSetup } from '../types';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import { getAPIKeyForSyntheticsService } from '../synthetics_service/get_api_key';
import {
  RebalancePrivateLocationShardsTask,
  RECOVERY_STABILITY_MS,
  STALE_CHECKIN_MS,
  STALE_DATA_MS,
} from './rebalance_private_location_shards_task';

jest.mock('../synthetics_service/get_private_locations');
jest.mock('../synthetics_service/get_api_key');

const getPrivateLocationsMock = getPrivateLocations as jest.MockedFunction<
  typeof getPrivateLocations
>;
const getAPIKeyMock = getAPIKeyForSyntheticsService as jest.MockedFunction<
  typeof getAPIKeyForSyntheticsService
>;

describe('Rebalance private location shards tasks', () => {
  const NOW = 1_700_000_000_000;
  const AGENT_POLICY = 'ap1';
  const scalableLocation = {
    id: 'loc1',
    label: 'Scalable Location',
    agentPolicyId: AGENT_POLICY,
    agentConditionSharding: true,
    isServiceManaged: false,
  };

  const iso = (ms: number) => new Date(ms).toISOString();
  const FRESH = NOW - 10_000; // 10s ago → fresh
  const STALE = NOW - (STALE_CHECKIN_MS + 60_000); // well past the stale window

  let listAgents: jest.Mock;
  let rebalanceShards: jest.Mock;
  let dataSearch: jest.Mock;
  let server: SyntheticsServerSetup;
  let monitorClient: SyntheticsMonitorClient;

  // host name → last_checkin ms (or null for an agent that never checked in).
  const setHostCheckins = (checkins: Record<string, number | null>) => {
    listAgents.mockResolvedValue({
      agents: Object.entries(checkins).map(([host, ms], i) => ({
        id: `agent-${i}`,
        policy_id: AGENT_POLICY,
        // A usable host.id is required to be an assignable shard target (composite key).
        local_metadata: { host: { name: host, id: `${host}-id` } },
        last_checkin: ms == null ? undefined : iso(ms),
      })),
    });
  };

  // host name → { checkin ms, host RAM in bytes, host.id } for capacity-aware tests.
  const setHostAgents = (
    agentsByHost: Record<string, { checkin: number | null; memoryBytes?: number; hostId?: string }>
  ) => {
    listAgents.mockResolvedValue({
      agents: Object.entries(agentsByHost).map(([host, { checkin, memoryBytes, hostId }], i) => ({
        id: `agent-${i}`,
        policy_id: AGENT_POLICY,
        local_metadata: { host: { name: host, memory: memoryBytes, id: hostId } },
        last_checkin: checkin == null ? undefined : iso(checkin),
      })),
    });
  };

  // Agent ids that have written a synthetics-* doc within STALE_DATA_MS. Enabling
  // this also flips the (otherwise absent) service API key to valid so the
  // data-plane veto path runs.
  const setActiveAgentData = (agentIds: string[]) => {
    getAPIKeyMock.mockResolvedValue({
      isValid: true,
      apiKey: { id: 'svc-key', apiKey: 'svc-secret' },
    } as never);
    dataSearch.mockResolvedValue({
      aggregations: { agents: { buckets: agentIds.map((key) => ({ key })) } },
    } as never);
  };

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    listAgents = jest.fn();
    rebalanceShards = jest.fn().mockResolvedValue({ total: 10, moved: 0 });
    dataSearch = jest.fn().mockResolvedValue({ aggregations: { agents: { buckets: [] } } });

    getPrivateLocationsMock.mockResolvedValue([scalableLocation] as never);
    // Default: no usable service API key → data-plane veto is skipped and
    // liveness falls back to check-ins only (prior behavior).
    getAPIKeyMock.mockResolvedValue({ isValid: false } as never);

    server = {
      logger: loggerMock.create(),
      coreStart: {
        savedObjects: { createInternalRepository: () => ({}) },
        elasticsearch: {
          client: { asScoped: () => ({ asCurrentUser: { search: dataSearch } }) },
        },
      },
      fleet: {
        agentService: {
          asInternalUser: { listAgents },
        },
      },
    } as unknown as SyntheticsServerSetup;

    monitorClient = {
      privateLocationAPI: { rebalanceShards },
    } as unknown as SyntheticsMonitorClient;
  });

  afterEach(() => jest.restoreAllMocks());

  describe('RebalancePrivateLocationShardsTask', () => {
    let task: RebalancePrivateLocationShardsTask;

    const runTask = (state: Record<string, unknown> = {}) =>
      task.runTask({
        taskInstance: { state, schedule: { interval: '1m' } } as unknown as ConcreteTaskInstance,
      });

    const healthyHostsArg = () => [...rebalanceShards.mock.calls[0][0].healthyHosts].sort();
    const recoveryHostsArg = () => [...rebalanceShards.mock.calls[0][0].recoveryHosts].sort();
    const capacitiesArg = (): Map<string, number> => rebalanceShards.mock.calls[0][0].capacities;
    const hostIdsArg = (): Map<string, string> => rebalanceShards.mock.calls[0][0].hostIds;
    const key = (host: string) => `${AGENT_POLICY}:${host}`;

    // Prior state where the given hosts have been healthy long enough to be stable.
    const stableSince = (...hosts: string[]) => ({
      healthySince: Object.fromEntries(
        hosts.map((host) => [key(host), NOW - RECOVERY_STABILITY_MS - 1_000])
      ),
    });

    beforeEach(() => {
      task = new RebalancePrivateLocationShardsTask(server, monitorClient);
    });

    it('treats all agents with recent check-ins as healthy', async () => {
      setHostCheckins({ h1: FRESH, h2: FRESH, h3: FRESH });

      await runTask();

      // One agent query per scalable location.
      expect(listAgents).toHaveBeenCalledTimes(1);
      expect(rebalanceShards).toHaveBeenCalledTimes(1);
      expect(healthyHostsArg()).toEqual(['h1', 'h2', 'h3']);
    });

    it('paginates the agent listing so agents past the first page are not dropped', async () => {
      const PER_PAGE = 1000;
      const fullPage = Array.from({ length: PER_PAGE }, (_, i) => ({
        id: `a-${i}`,
        policy_id: AGENT_POLICY,
        local_metadata: { host: { name: `p1h${i}`, id: `p1h${i}-id` } },
        last_checkin: iso(FRESH),
      }));
      const overflowPage = [
        {
          id: 'a-overflow',
          policy_id: AGENT_POLICY,
          local_metadata: { host: { name: 'overflow', id: 'overflow-id' } },
          last_checkin: iso(FRESH),
        },
      ];
      listAgents.mockImplementation(({ page }: { page: number }) =>
        Promise.resolve({ agents: page === 1 ? fullPage : page === 2 ? overflowPage : [] })
      );

      await runTask();

      // A full first page forces a second fetch; a short second page stops it.
      expect(listAgents).toHaveBeenCalledTimes(2);
      expect(healthyHostsArg()).toContain('overflow');
    });

    it('evicts an agent whose last check-in is older than the stale window', async () => {
      setHostCheckins({ h1: FRESH, h2: FRESH, h3: STALE });

      await runTask();

      expect(healthyHostsArg()).toEqual(['h1', 'h2']);
      expect(rebalanceShards).toHaveBeenCalledWith(
        expect.objectContaining({
          location: scalableLocation,
          healthyHosts: expect.not.arrayContaining(['h3']),
        })
      );
    });

    it('treats an agent with no check-in as stale', async () => {
      setHostCheckins({ h1: FRESH, h2: FRESH, h3: null });

      await runTask();

      expect(healthyHostsArg()).toEqual(['h1', 'h2']);
    });

    describe('data-plane liveness veto', () => {
      it('keeps a check-in-stale agent that is still writing synthetics data', async () => {
        // h3's check-in lagged past the stale window (e.g. Fleet checkin EOF), but
        // its Heartbeat kept indexing results → provably alive, must not be evicted.
        setHostCheckins({ h1: FRESH, h2: FRESH, h3: STALE }); // h3 → agent-2
        setActiveAgentData(['agent-2']);

        await runTask();

        expect(healthyHostsArg()).toEqual(['h1', 'h2', 'h3']);
      });

      it('still evicts a check-in-stale agent that has written no recent data', async () => {
        setHostCheckins({ h1: FRESH, h2: FRESH, h3: STALE });
        setActiveAgentData(['agent-0', 'agent-1']); // h3 (agent-2) absent → dead

        await runTask();

        expect(healthyHostsArg()).toEqual(['h1', 'h2']);
      });

      it('queries synthetics data only for the location agents, within the data window', async () => {
        setHostCheckins({ h1: FRESH, h2: FRESH, h3: STALE });
        setActiveAgentData(['agent-2']);

        await runTask();

        expect(dataSearch).toHaveBeenCalledTimes(1);
        const body = dataSearch.mock.calls[0][0];
        expect(body.query.bool.filter).toEqual(
          expect.arrayContaining([
            { terms: { 'agent.id': ['agent-0', 'agent-1', 'agent-2'] } },
            { range: { '@timestamp': { gte: NOW - STALE_DATA_MS, format: 'epoch_millis' } } },
          ])
        );
      });

      it('falls back to check-ins when no service API key is available', async () => {
        setHostCheckins({ h1: FRESH, h2: FRESH, h3: STALE });
        // default getAPIKeyMock → { isValid: false }

        await runTask();

        expect(dataSearch).not.toHaveBeenCalled();
        expect(healthyHostsArg()).toEqual(['h1', 'h2']);
      });

      it('falls back to check-ins when the data query fails', async () => {
        setHostCheckins({ h1: FRESH, h2: FRESH, h3: STALE });
        getAPIKeyMock.mockResolvedValue({
          isValid: true,
          apiKey: { id: 'svc-key', apiKey: 'svc-secret' },
        } as never);
        dataSearch.mockRejectedValue(new Error('no read privilege'));

        await runTask();

        expect(healthyHostsArg()).toEqual(['h1', 'h2']);
      });
    });

    it('passes per-host RAM (MiB) as capacities for capacity-aware placement', async () => {
      const GIB = 1024 * 1024 * 1024;
      setHostAgents({
        h1: { checkin: FRESH, memoryBytes: 8 * GIB, hostId: 'h1-id' },
        h2: { checkin: FRESH, memoryBytes: 16 * GIB, hostId: 'h2-id' },
      });

      await runTask();

      expect(capacitiesArg()).toEqual(
        new Map([
          ['h1', 8 * 1024],
          ['h2', 16 * 1024],
        ])
      );
    });

    it('omits hosts without reported RAM from capacities (uniform fallback)', async () => {
      const GIB = 1024 * 1024 * 1024;
      setHostAgents({
        h1: { checkin: FRESH, memoryBytes: 8 * GIB, hostId: 'h1-id' },
        h2: { checkin: FRESH, hostId: 'h2-id' }, // no memory reported
      });

      await runTask();

      expect(capacitiesArg()).toEqual(new Map([['h1', 8 * 1024]]));
    });

    it('passes host.id per host as hostIds (for uniquely pinning same-named agents)', async () => {
      setHostAgents({
        h1: { checkin: FRESH, hostId: 'uid-1' },
        h2: { checkin: FRESH, hostId: 'uid-2' },
      });

      await runTask();

      expect(hostIdsArg()).toEqual(
        new Map([
          ['h1', 'uid-1'],
          ['h2', 'uid-2'],
        ])
      );
    });

    it('drops a host with no usable host.id (a composite key is required to pin uniquely)', async () => {
      setHostAgents({
        h1: { checkin: FRESH, hostId: 'uid-1' },
        h2: { checkin: FRESH }, // no host.id → not an assignable shard target
      });

      await runTask();

      expect(healthyHostsArg()).toEqual(['h1']);
      expect(hostIdsArg()).toEqual(new Map([['h1', 'uid-1']]));
    });

    it('skips rebalance when no agents are healthy', async () => {
      setHostCheckins({ h1: STALE, h2: STALE });

      await runTask();

      expect(rebalanceShards).not.toHaveBeenCalled();
      expect(server.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No healthy agents for private location loc1')
      );
    });

    it('skips rebalance when there are no scalable locations', async () => {
      getPrivateLocationsMock.mockResolvedValue([
        { ...scalableLocation, agentConditionSharding: false },
      ] as never);

      await runTask();

      expect(listAgents).not.toHaveBeenCalled();
      expect(rebalanceShards).not.toHaveBeenCalled();
    });

    it('skips a location whose agent query fails', async () => {
      listAgents.mockRejectedValue(new Error('boom'));

      await runTask();

      expect(rebalanceShards).not.toHaveBeenCalled();
    });

    describe('recovery hysteresis', () => {
      it('excludes freshly-seen agents from recovery until they clear the stability window', async () => {
        setHostCheckins({ h1: FRESH, h2: FRESH, h3: FRESH });

        // No prior state → every agent's healthy streak starts now, so none are
        // recovery-eligible yet even though all are healthy/live.
        const { state } = await runTask();

        expect(healthyHostsArg()).toEqual(['h1', 'h2', 'h3']);
        expect(recoveryHostsArg()).toEqual([]);
        expect((state as { healthySince: Record<string, number> }).healthySince).toEqual({
          [key('h1')]: NOW,
          [key('h2')]: NOW,
          [key('h3')]: NOW,
        });
      });

      it('marks agents healthy beyond the stability window as recovery-eligible', async () => {
        setHostCheckins({ h1: FRESH, h2: FRESH, h3: FRESH });

        await runTask(stableSince('h1', 'h2', 'h3'));

        expect(recoveryHostsArg()).toEqual(['h1', 'h2', 'h3']);
      });

      it('holds a freshly recovered agent out of recovery while stable agents stay eligible', async () => {
        // h1/h2 have been healthy a while; h3 was down last run (absent) and is
        // now back — it must earn stability before receiving recovery work.
        setHostCheckins({ h1: FRESH, h2: FRESH, h3: FRESH });

        const { state } = await runTask(stableSince('h1', 'h2'));

        expect(healthyHostsArg()).toEqual(['h1', 'h2', 'h3']);
        expect(recoveryHostsArg()).toEqual(['h1', 'h2']);
        const { healthySince } = state as { healthySince: Record<string, number> };
        expect(healthySince[key('h1')]).toBe(NOW - RECOVERY_STABILITY_MS - 1_000); // streak preserved
        expect(healthySince[key('h3')]).toBe(NOW); // recovery streak restarted
      });

      it('resets the streak for an agent that went unhealthy', async () => {
        setHostCheckins({ h1: FRESH, h2: FRESH, h3: STALE });

        // h3 was stable before but is stale now → dropped from the streak map so
        // its grace window restarts if it comes back.
        const { state } = await runTask(stableSince('h1', 'h2', 'h3'));

        expect(recoveryHostsArg()).toEqual(['h1', 'h2']);
        expect((state as { healthySince: Record<string, number> }).healthySince).not.toHaveProperty(
          key('h3')
        );
      });
    });
  });
});
