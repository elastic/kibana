/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSyntheticsDynamicSettings } from '../../saved_objects/synthetics_settings';
import { getAgentPoliciesAsInternalUser } from '../settings/private_locations/get_agent_policies';
import { getPrivateLocationsAndAgentPolicies } from '../settings/private_locations/get_private_locations';
import { getSyntheticsDiagnosticsRoute } from './get_synthetics_diagnostics';

jest.mock('../../saved_objects/synthetics_settings', () => ({
  getSyntheticsDynamicSettings: jest.fn(),
}));

jest.mock('../settings/private_locations/get_private_locations', () => ({
  getPrivateLocationsAndAgentPolicies: jest.fn(),
}));

jest.mock('../settings/private_locations/get_agent_policies', () => ({
  getAgentPoliciesAsInternalUser: jest.fn(),
}));

jest.mock('../overview_status/overview_status_service', () => ({
  OverviewStatusService: jest.fn().mockImplementation(() => ({
    getOverviewStatusWithPrefetchedMonitors: jest.fn().mockResolvedValue({}),
  })),
}));

const mockGetPrivateLocations = getPrivateLocationsAndAgentPolicies as jest.Mock;
const mockGetAgentPolicies = getAgentPoliciesAsInternalUser as jest.Mock;
const mockGetDynamicSettings = getSyntheticsDynamicSettings as jest.Mock;

const inSpacePolicy = {
  id: 'policy-in-space',
  name: 'In space',
  spaceIds: ['default'],
};

describe('getSyntheticsDiagnosticsRoute', () => {
  const savedObjectsClient = {
    createPointInTimeFinder: jest.fn().mockReturnValue({
      find: async function* find() {},
      close: jest.fn(),
    }),
  };
  const syntheticsMonitorClient = { serviceManagedLocations: { syncErrors: null } };
  const server = {
    stackVersion: '9.6.0',
    fleet: {
      packagePolicyService: {
        list: jest.fn().mockResolvedValue({ items: [] }),
      },
    },
  };
  const syntheticsEsClient = {
    baseESClient: {
      indices: {
        getMapping: jest.fn().mockResolvedValue({}),
        getSettings: jest.fn().mockResolvedValue({}),
        stats: jest.fn().mockResolvedValue({}),
      },
    },
  };

  beforeEach(() => {
    mockGetDynamicSettings.mockResolvedValue({});
    mockGetPrivateLocations.mockResolvedValue({
      locations: [],
      agentPolicies: [inSpacePolicy],
    });
    mockGetAgentPolicies.mockResolvedValue([inSpacePolicy]);
  });

  it('loads private-location agent policies for the request space only', async () => {
    const result = await getSyntheticsDiagnosticsRoute().handler({
      monitorConfigRepository: { getAll: jest.fn().mockResolvedValue([]) },
      savedObjectsClient,
      server,
      spaceId: 'default',
      syntheticsEsClient,
      syntheticsMonitorClient,
    } as any);

    expect(mockGetPrivateLocations).toHaveBeenCalledWith(
      savedObjectsClient,
      syntheticsMonitorClient,
      false,
      'default'
    );
    expect(mockGetAgentPolicies).toHaveBeenCalledWith({
      server,
      withAgentCount: true,
      spaceId: 'default',
    });
    expect(result.privateLocationAgentPolicies).toEqual([inSpacePolicy]);
    expect(result.fleetAgentPolicies).toEqual([inSpacePolicy]);
  });
});
