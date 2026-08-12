/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitorAgentAssignment } from './get_monitor_agent_assignment';
import { getMonitorAgentAssignmentRoute } from './get_monitor_agent_assignment';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import { PackagePolicyService } from '../../../synthetics_service/private_location/package_policy_service';
import { getAgentHostInfo } from '../../../tasks/rebalance_private_location_shards_task';

jest.mock('./get_private_locations');
jest.mock('../../../synthetics_service/private_location/package_policy_service');
jest.mock('../../../tasks/rebalance_private_location_shards_task', () => ({
  getAgentHostInfo: jest.fn(),
  STALE_CHECKIN_MS: 90_000,
}));

const CONFIG_ID = '98f6a314-3b5d-4e08-b27d-27bd44255462'; // UUID the UI passes
const QUERY_ID = 'My Monitor-my-project-default'; // custom_heartbeat_id (project monitors)
const LOCATION_ID = '008a2a27-1f56-445e-82a1-a5858e438791';
const AGENT_POLICY_ID = 'ap-1';
const HOST = 'host-a';
const CONDITION = `\${host.name} == '${HOST}' and \${host.id} == 'host-id-xyz'`;

const scalableLocation = {
  id: LOCATION_ID,
  label: 'Scalable POC location',
  agentPolicyId: AGENT_POLICY_ID,
  agentConditionSharding: true,
};

const setup = ({
  queryId,
  getMonitorImpl,
}: {
  queryId?: string;
  getMonitorImpl?: () => Promise<unknown>;
} = {}) => {
  (getPrivateLocationsAndAgentPolicies as jest.Mock).mockResolvedValue({
    locations: [scalableLocation],
    agentPolicies: [{ id: AGENT_POLICY_ID, name: 'Shard 1' }],
  });

  const getByIds = jest.fn().mockResolvedValue([{ condition: CONDITION }]);
  (PackagePolicyService as jest.Mock).mockImplementation(() => ({ getByIds }));

  (getAgentHostInfo as jest.Mock).mockResolvedValue(new Map([[HOST, { lastCheckin: Date.now() }]]));

  const get =
    getMonitorImpl ?? jest.fn().mockResolvedValue({ attributes: { id: queryId ?? CONFIG_ID } });

  const routeContext = {
    server: { logger: { debug: jest.fn(), error: jest.fn() } },
    request: { params: { monitorId: CONFIG_ID } },
    savedObjectsClient: {},
    syntheticsMonitorClient: {},
    monitorConfigRepository: { get },
    spaceId: 'default',
  } as any;

  return { routeContext, getByIds, get };
};

describe('getMonitorAgentAssignmentRoute', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves the package policy by the monitor query id (custom_heartbeat_id) for project monitors', async () => {
    const { routeContext, getByIds, get } = setup({ queryId: QUERY_ID });

    const result = await getMonitorAgentAssignmentRoute().handler(routeContext);

    expect(get).toHaveBeenCalledWith(CONFIG_ID);
    // The lookup must use the query-id-based policy id, not the raw config id.
    const { packagePolicyIds } = getByIds.mock.calls[0][0];
    expect(packagePolicyIds).toContain(`${QUERY_ID}-${LOCATION_ID}`);
    expect(packagePolicyIds).toContain(`${QUERY_ID}-${LOCATION_ID}-default`);

    expect(result).toEqual([
      {
        locationId: LOCATION_ID,
        locationLabel: 'Scalable POC location',
        agentPolicyId: AGENT_POLICY_ID,
        agentPolicyName: 'Shard 1',
        host: HOST,
        healthy: true,
      },
    ]);
  });

  it('falls back to the raw config id when the monitor cannot be loaded', async () => {
    const { routeContext, getByIds } = setup({
      getMonitorImpl: jest.fn().mockRejectedValue(new Error('not found')),
    });

    const result = (await getMonitorAgentAssignmentRoute().handler(
      routeContext
    )) as MonitorAgentAssignment[];

    const { packagePolicyIds } = getByIds.mock.calls[0][0];
    expect(packagePolicyIds).toContain(`${CONFIG_ID}-${LOCATION_ID}`);
    expect(result).toHaveLength(1);
    expect(result[0].host).toBe(HOST);
  });

  it('returns an empty list when there are no condition-sharded locations', async () => {
    const { routeContext } = setup();
    (getPrivateLocationsAndAgentPolicies as jest.Mock).mockResolvedValue({
      locations: [{ ...scalableLocation, agentConditionSharding: false }],
      agentPolicies: [{ id: AGENT_POLICY_ID, name: 'Shard 1' }],
    });

    const result = await getMonitorAgentAssignmentRoute().handler(routeContext);

    expect(result).toEqual([]);
  });

  it('reports the monitor as pending (no host) when its package policy is not found', async () => {
    const { routeContext, getByIds } = setup({ queryId: QUERY_ID });
    getByIds.mockResolvedValue([]);

    const result = await getMonitorAgentAssignmentRoute().handler(routeContext);

    expect(result).toEqual([]);
  });
});
