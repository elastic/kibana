/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEndpointLookupService } from './endpoint_lookup';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';

describe('createEndpointLookupService', () => {
  const spaceId = 'default';

  const buildService = (overrides?: {
    listAgents?: jest.Mock;
    ensureInCurrentSpace?: jest.Mock;
  }) => {
    const listAgents =
      overrides?.listAgents ??
      jest.fn().mockResolvedValue({
        agents: [{ id: 'agent-1', packages: ['endpoint'] }],
      });
    const ensureInCurrentSpace =
      overrides?.ensureInCurrentSpace ?? jest.fn().mockResolvedValue(undefined);

    const endpointAppContextService = {
      getInternalFleetServices: jest.fn(() => ({
        agent: { listAgents },
        ensureInCurrentSpace,
      })),
    } as unknown as EndpointAppContextService;

    return {
      lookup: createEndpointLookupService(endpointAppContextService, spaceId),
      listAgents,
      ensureInCurrentSpace,
    };
  };

  it('returns null when no agents match the hostname', async () => {
    const { lookup, listAgents } = buildService({
      listAgents: jest.fn().mockResolvedValue({ agents: [] }),
    });

    const result = await lookup.resolveByHostName('missing-host');

    expect(result).toBeNull();
    expect(listAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        kuery: 'local_metadata.host.name: missing-host',
        perPage: 1,
      })
    );
  });

  it('escapes KQL-special characters in the hostname', async () => {
    const { lookup, listAgents } = buildService();

    await lookup.resolveByHostName('host"with:quotes');

    expect(listAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        kuery: 'local_metadata.host.name: host\\"with\\:quotes',
      })
    );
  });

  it('validates the resolved agent is in the caller space', async () => {
    const { lookup, ensureInCurrentSpace } = buildService();

    await lookup.resolveByHostName('safe-host');

    expect(ensureInCurrentSpace).toHaveBeenCalledWith({ agentIds: ['agent-1'] });
  });

  it('resolves Elastic Defend agents to agentType endpoint', async () => {
    const { lookup } = buildService();

    const result = await lookup.resolveByHostName('defend-host');

    expect(result).toEqual({
      agentId: 'agent-1',
      agentType: 'endpoint',
      packages: ['endpoint'],
    });
  });

  it('resolves SentinelOne agents to agentType sentinel_one', async () => {
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [{ id: 'agent-s1', packages: ['sentinel_one'] }],
      }),
    });

    const result = await lookup.resolveByHostName('s1-host');

    expect(result).toEqual({
      agentId: 'agent-s1',
      agentType: 'sentinel_one',
      packages: ['sentinel_one'],
    });
  });

  it('defaults agentType to endpoint when packages are missing', async () => {
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [{ id: 'agent-unknown' }],
      }),
    });

    const result = await lookup.resolveByHostName('unknown-host');

    expect(result).toEqual({
      agentId: 'agent-unknown',
      agentType: 'endpoint',
      packages: [],
    });
  });
});
