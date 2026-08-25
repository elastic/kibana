/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { agentIdCondition } from '../../../synthetics_service/private_location/assign_by_condition';
import { PackagePolicyService } from '../../../synthetics_service/private_location/package_policy_service';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import { getMonitorAgentAssignment } from './get_monitor_agent_assignment';
import type { MonitorLocationAssignment } from '../../../../common/types';

jest.mock('./get_private_locations');
jest.mock('../../../synthetics_service/private_location/package_policy_service');

const mockGetLocations = getPrivateLocationsAndAgentPolicies as jest.Mock;
const mockGetByIds = jest.fn();
const mockPackagePolicyService = PackagePolicyService as jest.MockedClass<
  typeof PackagePolicyService
>;

const agent = (over: Record<string, unknown> = {}) => ({
  id: 'agent-1',
  status: 'online',
  last_checkin: '2026-08-01T00:00:00.000Z',
  local_metadata: {
    host: { name: 'host-a' },
    elastic: { agent: { version: '9.6.0' } },
  },
  ...over,
});

const makeContext = ({
  monitorId = 'mon-1',
  listAgentsImpl,
  getMonitorImpl,
}: {
  monitorId?: string;
  listAgentsImpl: jest.Mock;
  getMonitorImpl: jest.Mock;
}) => {
  const notFound = jest.fn((opts) => ({ status: 404, ...opts }));
  const routeContext = {
    request: { params: { monitorId } },
    response: { notFound },
    spaceId: 'default',
    monitorConfigRepository: { get: getMonitorImpl },
    server: { fleet: { agentService: { asInternalUser: { listAgents: listAgentsImpl } } } },
    savedObjectsClient: {},
    syntheticsMonitorClient: {},
  } as any;
  return { routeContext, notFound };
};

const run = async (routeContext: any) => getMonitorAgentAssignment().handler(routeContext);

describe('getMonitorAgentAssignment route', () => {
  it('binds monitorId on validate.params so the unversioned router populates request.params', () => {
    const { validate } = getMonitorAgentAssignment();

    expect(validate).toEqual(
      expect.objectContaining({
        params: expect.objectContaining({
          validate: expect.any(Function),
        }),
      })
    );
  });

  beforeEach(() => {
    mockGetLocations.mockResolvedValue({
      locations: [
        { id: 'loc-1', label: 'Location 1', agentPolicyId: 'policy-1', isAgentSharding: false },
      ],
      agentPolicies: [{ id: 'policy-1', name: 'Policy One' }],
    });
    mockGetByIds.mockResolvedValue([]);
    mockPackagePolicyService.mockImplementation(
      () =>
        ({
          getByIds: mockGetByIds,
        } as unknown as PackagePolicyService)
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('returns 404 when the monitor does not exist', async () => {
    const getMonitor = jest
      .fn()
      .mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('synthetics-monitor', 'missing')
      );
    const listAgents = jest.fn();
    const { routeContext, notFound } = makeContext({
      monitorId: 'missing',
      listAgentsImpl: listAgents,
      getMonitorImpl: getMonitor,
    });

    const result = await run(routeContext);

    expect(notFound).toHaveBeenCalledWith({
      body: { message: 'Monitor id missing not found!' },
    });
    expect(result).toEqual(expect.objectContaining({ status: 404 }));
    expect(listAgents).not.toHaveBeenCalled();
  });

  it('returns an empty list when the monitor has no private locations', async () => {
    const getMonitor = jest.fn().mockResolvedValue({
      attributes: { locations: [{ id: 'us-east', isServiceManaged: true }] },
    });
    const { routeContext } = makeContext({
      listAgentsImpl: jest.fn(),
      getMonitorImpl: getMonitor,
    });

    const result = await run(routeContext);

    expect(result).toEqual([]);
  });

  it('returns every enrolled agent for a classic private location', async () => {
    const getMonitor = jest.fn().mockResolvedValue({
      attributes: { locations: [{ id: 'loc-1', label: 'Location 1', isServiceManaged: false }] },
    });
    const listAgents = jest.fn().mockResolvedValue({
      agents: [
        agent(),
        agent({
          id: 'agent-2',
          status: 'offline',
          local_metadata: { host: { name: 'host-b' }, elastic: { agent: { version: '9.5.0' } } },
        }),
      ],
      total: 2,
    });
    const { routeContext } = makeContext({
      listAgentsImpl: listAgents,
      getMonitorImpl: getMonitor,
    });

    const result = (await run(routeContext)) as MonitorLocationAssignment[];

    expect(result).toEqual([
      {
        locationId: 'loc-1',
        locationLabel: 'Location 1',
        isAgentSharding: false,
        agentPolicyId: 'policy-1',
        agentPolicyName: 'Policy One',
        agents: [
          {
            agentId: 'agent-1',
            host: 'host-a',
            healthy: true,
            agentVersion: '9.6.0',
            enrolled: true,
          },
          {
            agentId: 'agent-2',
            host: 'host-b',
            healthy: false,
            agentVersion: '9.5.0',
            enrolled: true,
          },
        ],
      },
    ]);
    expect(result[0]).not.toHaveProperty('usedMemoryPct');
    expect(mockGetByIds).not.toHaveBeenCalled();
  });

  it('returns only the assigned agent for a sharded private location', async () => {
    mockGetLocations.mockResolvedValue({
      locations: [
        { id: 'loc-1', label: 'Location 1', agentPolicyId: 'policy-1', isAgentSharding: true },
      ],
      agentPolicies: [{ id: 'policy-1', name: 'Policy One' }],
    });
    mockGetByIds.mockResolvedValue([{ id: 'mon-1-loc-1', condition: agentIdCondition('agent-2') }]);
    const getMonitor = jest.fn().mockResolvedValue({
      attributes: { locations: [{ id: 'loc-1', isServiceManaged: false }] },
    });
    const listAgents = jest.fn().mockResolvedValue({
      agents: [
        agent(),
        agent({
          id: 'agent-2',
          local_metadata: { host: { name: 'host-b' }, elastic: { agent: { version: '9.5.0' } } },
        }),
      ],
      total: 2,
    });
    const { routeContext } = makeContext({
      listAgentsImpl: listAgents,
      getMonitorImpl: getMonitor,
    });

    const result = (await run(routeContext)) as MonitorLocationAssignment[];

    expect(result).toHaveLength(1);
    expect(result[0].isAgentSharding).toBe(true);
    expect(result[0].agents).toEqual([
      {
        agentId: 'agent-2',
        host: 'host-b',
        healthy: true,
        agentVersion: '9.5.0',
        enrolled: true,
      },
    ]);
    expect(mockGetByIds).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'default',
        packagePolicyIds: expect.arrayContaining(['mon-1-loc-1', 'mon-1-loc-1-default']),
        fields: ['id', 'name', 'condition'],
      })
    );
  });

  it('looks up package policies by MONITOR_QUERY_ID when it differs from the saved-object id', async () => {
    mockGetLocations.mockResolvedValue({
      locations: [
        { id: 'loc-1', label: 'Location 1', agentPolicyId: 'policy-1', isAgentSharding: true },
      ],
      agentPolicies: [{ id: 'policy-1', name: 'Policy One' }],
    });
    mockGetByIds.mockResolvedValue([
      { id: 'journey-project-default-loc-1', condition: agentIdCondition('agent-2') },
    ]);
    const getMonitor = jest.fn().mockResolvedValue({
      attributes: {
        id: 'journey-project-default',
        locations: [{ id: 'loc-1', isServiceManaged: false }],
      },
    });
    const listAgents = jest.fn().mockResolvedValue({
      agents: [
        agent({
          id: 'agent-2',
          local_metadata: { host: { name: 'host-b' }, elastic: { agent: { version: '9.5.0' } } },
        }),
      ],
      total: 1,
    });
    const { routeContext } = makeContext({
      monitorId: 'so-uuid',
      listAgentsImpl: listAgents,
      getMonitorImpl: getMonitor,
    });

    const result = (await run(routeContext)) as MonitorLocationAssignment[];

    expect(mockGetByIds).toHaveBeenCalledWith(
      expect.objectContaining({
        packagePolicyIds: expect.arrayContaining([
          'journey-project-default-loc-1',
          'journey-project-default-loc-1-default',
        ]),
      })
    );
    expect(mockGetByIds).not.toHaveBeenCalledWith(
      expect.objectContaining({
        packagePolicyIds: expect.arrayContaining(['so-uuid-loc-1']),
      })
    );
    expect(result[0].agents).toEqual([
      {
        agentId: 'agent-2',
        host: 'host-b',
        healthy: true,
        agentVersion: '9.5.0',
        enrolled: true,
      },
    ]);
  });

  it('returns no agents when a sharded monitor is still unassigned', async () => {
    mockGetLocations.mockResolvedValue({
      locations: [
        { id: 'loc-1', label: 'Location 1', agentPolicyId: 'policy-1', isAgentSharding: true },
      ],
      agentPolicies: [{ id: 'policy-1', name: 'Policy One' }],
    });
    mockGetByIds.mockResolvedValue([]);
    const getMonitor = jest.fn().mockResolvedValue({
      attributes: { locations: [{ id: 'loc-1', isServiceManaged: false }] },
    });
    const listAgents = jest.fn().mockResolvedValue({ agents: [agent()], total: 1 });
    const { routeContext } = makeContext({
      listAgentsImpl: listAgents,
      getMonitorImpl: getMonitor,
    });

    const result = (await run(routeContext)) as MonitorLocationAssignment[];

    expect(result[0].agents).toEqual([]);
  });

  it('returns the stamped agent as unhealthy when it is no longer enrolled', async () => {
    mockGetLocations.mockResolvedValue({
      locations: [
        { id: 'loc-1', label: 'Location 1', agentPolicyId: 'policy-1', isAgentSharding: true },
      ],
      agentPolicies: [{ id: 'policy-1', name: 'Policy One' }],
    });
    mockGetByIds.mockResolvedValue([
      { id: 'mon-1-loc-1', condition: agentIdCondition('gone-agent') },
    ]);
    const getMonitor = jest.fn().mockResolvedValue({
      attributes: { locations: [{ id: 'loc-1', isServiceManaged: false }] },
    });
    const listAgents = jest.fn().mockResolvedValue({ agents: [agent()], total: 1 });
    const { routeContext } = makeContext({
      listAgentsImpl: listAgents,
      getMonitorImpl: getMonitor,
    });

    const result = (await run(routeContext)) as MonitorLocationAssignment[];

    expect(result[0].agents).toEqual([
      {
        agentId: 'gone-agent',
        host: '',
        healthy: false,
        agentVersion: null,
        enrolled: false,
      },
    ]);
  });

  it('fails the request when package-policy reads fail', async () => {
    mockGetLocations.mockResolvedValue({
      locations: [
        { id: 'loc-1', label: 'Location 1', agentPolicyId: 'policy-1', isAgentSharding: true },
      ],
      agentPolicies: [{ id: 'policy-1', name: 'Policy One' }],
    });
    mockGetByIds.mockRejectedValue(new Error('Fleet unavailable'));
    const getMonitor = jest.fn().mockResolvedValue({
      attributes: { locations: [{ id: 'loc-1', isServiceManaged: false }] },
    });
    const { routeContext } = makeContext({
      listAgentsImpl: jest.fn(),
      getMonitorImpl: getMonitor,
    });

    await expect(run(routeContext)).rejects.toThrow('Fleet unavailable');
  });
});
