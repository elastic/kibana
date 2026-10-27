/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMissingCompleteAgentLocations } from './get_missing_complete_agents';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import type { MissingCompleteAgentLocationsResponse } from '../../../../common/types';

jest.mock('./get_private_locations');

const mockGetLocations = getPrivateLocationsAndAgentPolicies as jest.Mock;

const basicAgent = { id: 'basic', local_metadata: { elastic: { agent: { version: '9.6.0' } } } };
const completeAgent = {
  id: 'complete',
  local_metadata: { elastic: { agent: { version: '9.6.0', complete: true } } },
};

const makeContext = (listAgents: jest.Mock, loggerError = jest.fn()) => ({
  server: {
    fleet: { agentService: { asInternalUser: { listAgents } } },
    logger: { error: loggerError },
  },
  savedObjectsClient: {},
  syntheticsMonitorClient: {},
});

const run = async (routeContext: ReturnType<typeof makeContext>) =>
  (await getMissingCompleteAgentLocations().handler(
    routeContext as never
  )) as MissingCompleteAgentLocationsResponse;

describe('getMissingCompleteAgentLocations route', () => {
  beforeEach(() => {
    mockGetLocations.mockResolvedValue({
      locations: [
        { id: 'loc-1', label: 'Location 1', agentPolicyId: 'policy-1' },
        { id: 'loc-2', label: 'Location 2', agentPolicyId: 'policy-2' },
      ],
      agentPolicies: [],
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('returns the locations without an active complete agent', async () => {
    const listAgents = jest.fn().mockImplementation(({ kuery }: { kuery: string }) =>
      Promise.resolve({
        agents: kuery.includes('policy-1') ? [basicAgent, completeAgent] : [basicAgent],
        total: kuery.includes('policy-1') ? 2 : 1,
      })
    );

    const result = await run(makeContext(listAgents));

    expect(result).toEqual({ locations: [{ id: 'loc-2', label: 'Location 2' }] });
    // Without the status runtime field, `showInactive: false` still returns inactive agents.
    expect(listAgents).toHaveBeenCalledWith(
      expect.not.objectContaining({ includeStatusRuntimeField: false })
    );
    expect(listAgents).toHaveBeenCalledWith(expect.objectContaining({ showInactive: false }));
  });

  it('stops paging once a complete agent is found', async () => {
    mockGetLocations.mockResolvedValue({
      locations: [{ id: 'loc-1', label: 'Location 1', agentPolicyId: 'policy-1' }],
      agentPolicies: [],
    });
    const listAgents = jest.fn().mockResolvedValue({ agents: [completeAgent], total: 5000 });

    const result = await run(makeContext(listAgents));

    expect(result.locations).toEqual([]);
    expect(listAgents).toHaveBeenCalledTimes(1);
  });

  it('leaves out locations whose agents cannot be listed', async () => {
    const loggerError = jest.fn();
    const listAgents = jest
      .fn()
      .mockImplementation(({ kuery }: { kuery: string }) =>
        kuery.includes('policy-1')
          ? Promise.reject(new Error('fleet down'))
          : Promise.resolve({ agents: [basicAgent], total: 1 })
      );

    const result = await run(makeContext(listAgents, loggerError));

    expect(result.locations).toEqual([{ id: 'loc-2', label: 'Location 2' }]);
    expect(loggerError).toHaveBeenCalledTimes(1);
  });
});
