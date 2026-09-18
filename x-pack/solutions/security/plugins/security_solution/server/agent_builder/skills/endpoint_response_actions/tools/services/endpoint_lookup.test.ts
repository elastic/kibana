/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEndpointLookupService } from './endpoint_lookup';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { NotFoundError } from '../../../../../endpoint/errors';
import { HostStatus } from '../../../../../../common/endpoint/types';

describe('createEndpointLookupService', () => {
  const spaceId = 'default';

  const buildService = (overrides?: {
    listAgents?: jest.Mock;
    ensureInCurrentSpace?: jest.Mock;
    scoped?: { isCpsRead: () => boolean };
    getHostMetadataList?: jest.Mock;
  }) => {
    const listAgents =
      overrides?.listAgents ??
      jest.fn().mockResolvedValue({
        agents: [{ id: 'agent-1', status: 'online', packages: ['endpoint'] }],
      });
    const ensureInCurrentSpace =
      overrides?.ensureInCurrentSpace ?? jest.fn().mockResolvedValue(undefined);
    const getHostMetadataList = overrides?.getHostMetadataList ?? jest.fn();

    const endpointAppContextService = {
      getInternalFleetServices: jest.fn(() => ({
        agent: { listAgents },
        ensureInCurrentSpace,
      })),
      getEndpointMetadataService: jest.fn(() => ({ getHostMetadataList })),
    } as unknown as EndpointAppContextService;

    return {
      lookup: createEndpointLookupService(
        endpointAppContextService,
        spaceId,
        overrides?.scoped as never
      ),
      listAgents,
      ensureInCurrentSpace,
      getHostMetadataList,
    };
  };

  it('returns not_found when no agents match the hostname', async () => {
    const { lookup, listAgents } = buildService({
      listAgents: jest.fn().mockResolvedValue({ agents: [] }),
    });

    const result = await lookup.resolveByHostName('missing-host');

    expect(result).toEqual({ kind: 'not_found' });
    expect(listAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        kuery: 'local_metadata.host.name: missing-host',
        perPage: 10,
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
      kind: 'found',
      endpoint: {
        agentId: 'agent-1',
        agentType: 'endpoint',
        packages: ['endpoint'],
      },
    });
  });

  it('resolves SentinelOne agents to agentType sentinel_one', async () => {
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [{ id: 'agent-s1', status: 'online', packages: ['sentinel_one'] }],
      }),
    });

    const result = await lookup.resolveByHostName('s1-host');

    expect(result).toEqual({
      kind: 'found',
      endpoint: {
        agentId: 'agent-s1',
        agentType: 'sentinel_one',
        packages: ['sentinel_one'],
      },
    });
  });

  it('defaults agentType to endpoint when packages are missing', async () => {
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [{ id: 'agent-unknown', status: 'online' }],
      }),
    });

    const result = await lookup.resolveByHostName('unknown-host');

    expect(result).toEqual({
      kind: 'found',
      endpoint: {
        agentId: 'agent-unknown',
        agentType: 'endpoint',
        packages: [],
      },
    });
  });

  it('prefers the online agent over stale offline/uninstalled enrollments for the same hostname', async () => {
    // A host re-enrolled multiple times (reinstall, agent upgrade) leaves
    // every prior Fleet agent record behind, all matching the same hostname.
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [
          {
            id: 'old-9.4.3',
            status: 'uninstalled',
            enrolled_at: '2026-07-17T10:26:33.000Z',
            packages: ['endpoint'],
          },
          {
            id: 'broken-snapshot',
            status: 'offline',
            enrolled_at: '2026-07-17T13:07:14.000Z',
            packages: ['endpoint'],
          },
          {
            id: 'current-ga',
            status: 'online',
            enrolled_at: '2026-07-17T13:42:02.000Z',
            packages: ['endpoint'],
          },
        ],
      }),
    });

    const result = await lookup.resolveByHostName('multi-enrolled-host');

    // One live agent + stale history is normal bookkeeping, not ambiguity.
    expect(result.kind).toBe('found');
    expect(result).toHaveProperty('endpoint.agentId', 'current-ga');
  });

  it('falls back to the most recently enrolled agent when none are online', async () => {
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [
          { id: 'older', status: 'offline', enrolled_at: '2026-07-17T10:00:00.000Z' },
          { id: 'newer', status: 'offline', enrolled_at: '2026-07-17T13:00:00.000Z' },
        ],
      }),
    });

    const result = await lookup.resolveByHostName('all-offline-host');

    expect(result.kind).toBe('found');
    expect(result).toHaveProperty('endpoint.agentId', 'newer');
  });

  it('reports ambiguity when two online agents share the hostname', async () => {
    // Two distinct live machines can legitimately share a hostname. Silently
    // picking one would report — or isolate — the wrong host.
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [
          { id: 'live-a', status: 'online', enrolled_at: '2026-07-17T10:00:00.000Z' },
          { id: 'live-b', status: 'online', enrolled_at: '2026-07-17T13:00:00.000Z' },
        ],
      }),
    });

    const result = await lookup.resolveByHostName('duplicated-host');

    expect(result).toEqual({
      kind: 'ambiguous',
      // Newest enrolled first, matching the single-match tiebreak.
      candidates: [
        { agentId: 'live-b', status: 'online' },
        { agentId: 'live-a', status: 'online' },
      ],
    });
  });

  it('is not ambiguous when only one of several matching agents is online', async () => {
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [
          { id: 'offline-peer', status: 'offline', enrolled_at: '2026-07-17T10:00:00.000Z' },
          { id: 'live-one', status: 'online', enrolled_at: '2026-07-17T13:00:00.000Z' },
        ],
      }),
    });

    const result = await lookup.resolveByHostName('one-live-host');

    expect(result.kind).toBe('found');
    expect(result).toHaveProperty('endpoint.agentId', 'live-one');
  });

  it('ignores agents that are not visible in the caller space', async () => {
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [
          { id: 'other-space', status: 'online', packages: ['endpoint'] },
          { id: 'mine', status: 'online', packages: ['endpoint'] },
        ],
      }),
      ensureInCurrentSpace: jest.fn(async ({ agentIds }: { agentIds: string[] }) => {
        if (agentIds.includes('other-space')) {
          throw new NotFoundError('Agent not found');
        }
      }),
    });

    const result = await lookup.resolveByHostName('cross-space-host');

    expect(result).toEqual({
      kind: 'found',
      endpoint: { agentId: 'mine', agentType: 'endpoint', packages: ['endpoint'] },
    });
  });

  it('returns not_found when every matching agent is outside the caller space', async () => {
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [{ id: 'other-space', status: 'online', packages: ['endpoint'] }],
      }),
      ensureInCurrentSpace: jest.fn().mockRejectedValue(new NotFoundError('Agent not found')),
    });

    const result = await lookup.resolveByHostName('hidden-host');

    expect(result).toEqual({ kind: 'not_found' });
  });

  it('does not report ambiguity for agents hidden by space scoping', async () => {
    // Both would be "live" matches, but only one is visible here — that is a
    // single valid answer, not an ambiguous hostname.
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [
          { id: 'visible-live', status: 'online', packages: ['endpoint'] },
          { id: 'hidden-live', status: 'online', packages: ['endpoint'] },
        ],
      }),
      ensureInCurrentSpace: jest.fn(async ({ agentIds }: { agentIds: string[] }) => {
        if (agentIds.includes('hidden-live')) {
          throw new NotFoundError('Agent not found');
        }
      }),
    });

    const result = await lookup.resolveByHostName('partially-visible-host');

    expect(result.kind).toBe('found');
    expect(result).toHaveProperty('endpoint.agentId', 'visible-live');
  });

  describe('CPS fallback', () => {
    it('falls back to the scoped metadata index when Fleet has no match', async () => {
      // Fleet is origin-only. Under CPS the host may live in a linked project,
      // where only the request-scoped metadata read can see it.
      const { lookup, getHostMetadataList } = buildService({
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
        scoped: { isCpsRead: () => true },
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [{ metadata: { agent: { id: 'linked-agent' } }, host_status: HostStatus.HEALTHY }],
          total: 1,
        }),
      });

      const result = await lookup.resolveByHostName('linked-host');

      expect(result.kind).toBe('found');
      expect(result).toHaveProperty('endpoint.agentId', 'linked-agent');
      expect(getHostMetadataList).toHaveBeenCalledWith(
        expect.objectContaining({ kuery: 'united.endpoint.host.hostname: linked-host' }),
        expect.objectContaining({ isCpsRead: expect.any(Function) })
      );
    });

    it('reports ambiguity when two live linked-project agents share the hostname', async () => {
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
        scoped: { isCpsRead: () => true },
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            { metadata: { agent: { id: 'linked-a' } }, host_status: HostStatus.HEALTHY },
            { metadata: { agent: { id: 'linked-b' } }, host_status: HostStatus.HEALTHY },
          ],
          total: 2,
        }),
      });

      const result = await lookup.resolveByHostName('linked-host');

      expect(result.kind).toBe('ambiguous');
      expect(result).toHaveProperty('candidates', [
        { agentId: 'linked-a', status: HostStatus.HEALTHY },
        { agentId: 'linked-b', status: HostStatus.HEALTHY },
      ]);
    });

    it('stays not_found when the fallback runs but finds nothing', async () => {
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
        scoped: { isCpsRead: () => true },
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      });

      expect(await lookup.resolveByHostName('missing-host')).toEqual({ kind: 'not_found' });
    });

    it('does not consult the metadata index when CPS is inactive', async () => {
      const { lookup, getHostMetadataList } = buildService({
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
        scoped: { isCpsRead: () => false },
        getHostMetadataList: jest.fn(),
      });

      expect(await lookup.resolveByHostName('missing-host')).toEqual({ kind: 'not_found' });
      expect(getHostMetadataList).not.toHaveBeenCalled();
    });

    it('does not consult the metadata index when no scoped services were supplied', async () => {
      const { lookup, getHostMetadataList } = buildService({
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
        getHostMetadataList: jest.fn(),
      });

      expect(await lookup.resolveByHostName('missing-host')).toEqual({ kind: 'not_found' });
      expect(getHostMetadataList).not.toHaveBeenCalled();
    });
  });

  describe('CPS reconciliation', () => {
    it('resolves through the scoped metadata index when every Fleet match is hidden by space scoping', async () => {
      // Origin Fleet knows the hostname but this space cannot see any of its
      // agents. Under CPS the linked-project endpoint is still visible through
      // the request-scoped metadata read, so resolution must not stop at the
      // empty visible set.
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'origin-other-space', status: 'online', packages: ['endpoint'] }],
        }),
        ensureInCurrentSpace: jest.fn().mockRejectedValue(new NotFoundError('Agent not found')),
        scoped: { isCpsRead: () => true },
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [{ metadata: { agent: { id: 'linked-agent' } }, host_status: HostStatus.HEALTHY }],
          total: 1,
        }),
      });

      const result = await lookup.resolveByHostName('shared-host');

      expect(result.kind).toBe('found');
      expect(result).toHaveProperty('endpoint.agentId', 'linked-agent');
    });

    it('reports ambiguity when origin Fleet and a linked project both have the hostname live', async () => {
      // Two live machines sharing a hostname is ambiguous whichever project
      // they live in; picking the origin one silently would report — or
      // isolate — the wrong host.
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'origin-live', status: 'online', packages: ['endpoint'] }],
        }),
        scoped: { isCpsRead: () => true },
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [{ metadata: { agent: { id: 'linked-live' } }, host_status: HostStatus.HEALTHY }],
          total: 1,
        }),
      });

      const result = await lookup.resolveByHostName('shared-host');

      expect(result).toEqual({
        kind: 'ambiguous',
        candidates: [
          { agentId: 'origin-live', status: 'online' },
          { agentId: 'linked-live', status: HostStatus.HEALTHY },
        ],
      });
    });

    it('does not double-count a metadata entry Fleet already returned for the same agent', async () => {
      // One agent seen from two views is still one agent, not ambiguity.
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-1', status: 'online', packages: ['endpoint'] }],
        }),
        scoped: { isCpsRead: () => true },
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [{ metadata: { agent: { id: 'agent-1' } }, host_status: HostStatus.HEALTHY }],
          total: 1,
        }),
      });

      const result = await lookup.resolveByHostName('shared-host');

      expect(result).toEqual({
        kind: 'found',
        endpoint: { agentId: 'agent-1', agentType: 'endpoint', packages: ['endpoint'] },
      });
    });
  });
});
