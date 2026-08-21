/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOutdatedMwAgentLocations } from './get_outdated_mw_agents';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import type { OutdatedMwAgentLocationsResponse } from '../../../../common/utils/agent_mw_support';

jest.mock('./get_private_locations');

const mockGetLocations = getPrivateLocationsAndAgentPolicies as jest.Mock;

interface FakeAgent {
  id?: string;
  local_metadata?: {
    elastic?: { agent?: { version?: string } };
  };
}

const agent = (over: FakeAgent = {}): FakeAgent => ({
  id: 'agent-1',
  local_metadata: {
    elastic: { agent: { version: '9.6.0' } },
  },
  ...over,
});

const makeContext = (listAgentsImpl: jest.Mock) => ({
  server: { fleet: { agentService: { asInternalUser: { listAgents: listAgentsImpl } } } },
  savedObjectsClient: {},
  syntheticsMonitorClient: {},
});

const run = async (routeContext: ReturnType<typeof makeContext>) => {
  const result = await getOutdatedMwAgentLocations().handler(routeContext as never);
  if (!result || Array.isArray(result) || !('outdatedLocationIds' in result)) {
    throw new Error('Expected OutdatedMwAgentLocationsResponse from handler');
  }
  return result as OutdatedMwAgentLocationsResponse;
};

describe('getOutdatedMwAgentLocations route', () => {
  beforeEach(() => {
    mockGetLocations.mockResolvedValue({
      locations: [{ id: 'loc-1', label: 'Location 1', agentPolicyId: 'policy-1' }],
      agentPolicies: [],
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('returns no locations when every agent is MW-compatible', async () => {
    const listAgents = jest.fn().mockResolvedValue({
      agents: [agent({ local_metadata: { elastic: { agent: { version: '8.19.0' } } } })],
      total: 1,
    });

    const result = await run(makeContext(listAgents));

    expect(result.outdatedLocationIds).toEqual([]);
    expect(mockGetLocations).toHaveBeenCalledWith(expect.anything(), expect.anything(), true);
  });

  it('includes a location with at least one agent older than the MW threshold', async () => {
    const listAgents = jest.fn().mockResolvedValue({
      agents: [
        agent({ id: 'ok', local_metadata: { elastic: { agent: { version: '9.3.4' } } } }),
        agent({ id: 'old', local_metadata: { elastic: { agent: { version: '8.17.2' } } } }),
      ],
      total: 2,
    });

    const result = await run(makeContext(listAgents));

    expect(result.outdatedLocationIds).toEqual(['loc-1']);
  });

  it('does not flag a location solely because of an unparsable agent version', async () => {
    const listAgents = jest.fn().mockResolvedValue({
      agents: [agent({ local_metadata: { elastic: { agent: { version: undefined } } } })],
      total: 1,
    });

    const result = await run(makeContext(listAgents));

    expect(result.outdatedLocationIds).toEqual([]);
  });

  it('treats 8.19.0-SNAPSHOT as compatible', async () => {
    const listAgents = jest.fn().mockResolvedValue({
      agents: [agent({ local_metadata: { elastic: { agent: { version: '8.19.0-SNAPSHOT' } } } })],
      total: 1,
    });

    const result = await run(makeContext(listAgents));

    expect(result.outdatedLocationIds).toEqual([]);
  });

  it('stops paging a location once an outdated agent is found', async () => {
    const listAgents = jest
      .fn()
      .mockResolvedValueOnce({
        agents: [
          agent({ id: 'old', local_metadata: { elastic: { agent: { version: '8.17.0' } } } }),
        ],
        total: 3,
      })
      .mockResolvedValueOnce({
        agents: [agent({ id: 'later' })],
        total: 3,
      });

    const result = await run(makeContext(listAgents));

    expect(result.outdatedLocationIds).toEqual(['loc-1']);
    expect(listAgents).toHaveBeenCalledTimes(1);
  });

  it('only flags the affected location out of several', async () => {
    mockGetLocations.mockResolvedValue({
      locations: [
        { id: 'loc-ok', label: 'OK', agentPolicyId: 'policy-ok' },
        { id: 'loc-outdated', label: 'Old', agentPolicyId: 'policy-old' },
      ],
      agentPolicies: [],
    });
    const listAgents = jest.fn().mockImplementation(async ({ kuery }: { kuery: string }) => {
      if (kuery.includes('policy-old')) {
        return {
          agents: [agent({ local_metadata: { elastic: { agent: { version: '8.17.2' } } } })],
          total: 1,
        };
      }
      return {
        agents: [agent({ local_metadata: { elastic: { agent: { version: '9.3.4' } } } })],
        total: 1,
      };
    });

    const result = await run(makeContext(listAgents));

    expect(result.outdatedLocationIds).toEqual(['loc-outdated']);
  });

  it('skips a location when Fleet listing fails', async () => {
    const listAgents = jest.fn().mockRejectedValue(new Error('fleet down'));

    const result = await run(makeContext(listAgents));

    expect(result.outdatedLocationIds).toEqual([]);
  });
});
