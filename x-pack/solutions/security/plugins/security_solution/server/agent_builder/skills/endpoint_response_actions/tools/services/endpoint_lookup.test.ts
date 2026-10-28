/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEndpointLookupService, LOOKUP_PAGE_SIZE } from './endpoint_lookup';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { NotFoundError } from '../../../../../endpoint/errors';
import { HostStatus } from '../../../../../../common/endpoint/types';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';

describe('createEndpointLookupService', () => {
  const spaceId = 'default';

  const buildService = (overrides?: {
    listAgents?: jest.Mock;
    ensureInCurrentSpace?: jest.Mock;
    scoped?: { isCpsRead: () => boolean };
    getHostMetadataList?: jest.Mock;
    agentTypes?: ResponseActionAgentType[];
  }) => {
    const listAgents =
      overrides?.listAgents ??
      jest.fn().mockResolvedValue({
        agents: [{ id: 'agent-1', status: 'online', packages: ['endpoint'] }],
      });
    const ensureInCurrentSpace =
      overrides?.ensureInCurrentSpace ?? jest.fn().mockResolvedValue(undefined);
    const getHostMetadataList =
      overrides?.getHostMetadataList ?? jest.fn().mockResolvedValue({ data: [], total: 0 });

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
        overrides?.scoped as never,
        overrides?.agentTypes ? { agentTypes: overrides.agentTypes } : undefined
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
        kuery: 'local_metadata.host.name.keyword: "missing-host"',
        page: 1,
        perPage: LOOKUP_PAGE_SIZE,
      })
    );
  });

  it('escapes KQL-special characters in the hostname', async () => {
    const { lookup, listAgents } = buildService();

    await lookup.resolveByHostName('host"with:quotes');

    expect(listAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        kuery: 'local_metadata.host.name.keyword: "host\\"with:quotes"',
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
        status: 'healthy',
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
        status: 'healthy',
      },
    });
  });

  it('ignores agents without a response-action integration even when they match the hostname', async () => {
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [{ id: 'agent-unknown', status: 'online' }],
      }),
    });

    const result = await lookup.resolveByHostName('unknown-host');

    expect(result).toEqual({ kind: 'not_found' });
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
          {
            id: 'older',
            status: 'offline',
            packages: ['endpoint'],
            enrolled_at: '2026-07-17T10:00:00.000Z',
          },
          {
            id: 'newer',
            status: 'offline',
            packages: ['endpoint'],
            enrolled_at: '2026-07-17T13:00:00.000Z',
          },
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
          {
            id: 'live-a',
            status: 'online',
            packages: ['endpoint'],
            enrolled_at: '2026-07-17T10:00:00.000Z',
          },
          {
            id: 'live-b',
            status: 'online',
            packages: ['endpoint'],
            enrolled_at: '2026-07-17T13:00:00.000Z',
          },
        ],
      }),
    });

    const result = await lookup.resolveByHostName('duplicated-host');

    expect(result).toEqual({
      kind: 'ambiguous',
      // Newest enrolled first, matching the single-match tiebreak.
      candidates: [
        { agentId: 'live-b', status: HostStatus.HEALTHY },
        { agentId: 'live-a', status: HostStatus.HEALTHY },
      ],
    });
  });

  it('reports Fleet candidate status in the HostStatus vocabulary while isLive follows the raw Fleet status', async () => {
    // `updating` and `degraded` are active machines (isLive), but the
    // reported status must be the `HostStatus` value the UI shows, never the
    // raw Fleet `AgentStatus`.
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [
          {
            id: 'updating-a',
            status: 'updating',
            packages: ['endpoint'],
            enrolled_at: '2026-07-17T10:00:00.000Z',
          },
          {
            id: 'degraded-b',
            status: 'degraded',
            packages: ['endpoint'],
            enrolled_at: '2026-07-17T13:00:00.000Z',
          },
        ],
      }),
    });

    const result = await lookup.resolveByHostName('duplicated-host');

    expect(result).toEqual({
      kind: 'ambiguous',
      candidates: [
        { agentId: 'degraded-b', status: HostStatus.UNHEALTHY },
        { agentId: 'updating-a', status: HostStatus.UPDATING },
      ],
    });
  });

  it('reports gone Fleet statuses as unenrolled in a truncated ambiguity result', async () => {
    // A truncated page reports every candidate (not only the live ones), so a
    // gone record must carry the same `unenrolled` the metadata path reports
    // rather than the mapper's `unhealthy` fallback. `orphaned` is an active
    // Fleet status and stays `unhealthy`.
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [
          {
            id: 'unenrolled-a',
            status: 'unenrolled',
            packages: ['endpoint'],
            enrolled_at: '2026-07-17T10:00:00.000Z',
          },
          {
            id: 'uninstalled-b',
            status: 'uninstalled',
            packages: ['endpoint'],
            enrolled_at: '2026-07-17T11:00:00.000Z',
          },
          {
            id: 'orphaned-c',
            status: 'orphaned',
            packages: ['endpoint'],
            enrolled_at: '2026-07-17T12:00:00.000Z',
          },
          {
            id: 'online-d',
            status: 'online',
            packages: ['endpoint'],
            enrolled_at: '2026-07-17T13:00:00.000Z',
          },
        ],
        total: LOOKUP_PAGE_SIZE + 1,
      }),
    });

    const result = await lookup.resolveByHostName('duplicated-host');

    expect(result).toEqual(expect.objectContaining({ kind: 'ambiguous', truncated: true }));
    const candidates = (result as { candidates: Array<{ agentId: string; status: string }> })
      .candidates;
    expect(Object.fromEntries(candidates.map((c) => [c.agentId, c.status]))).toEqual({
      'unenrolled-a': HostStatus.UNENROLLED,
      'uninstalled-b': HostStatus.UNENROLLED,
      'orphaned-c': HostStatus.UNHEALTHY,
      'online-d': HostStatus.HEALTHY,
    });
  });

  it('is not ambiguous when only one of several matching agents is online', async () => {
    const { lookup } = buildService({
      listAgents: jest.fn().mockResolvedValue({
        agents: [
          {
            id: 'offline-peer',
            status: 'offline',
            packages: ['endpoint'],
            enrolled_at: '2026-07-17T10:00:00.000Z',
          },
          {
            id: 'live-one',
            status: 'online',
            packages: ['endpoint'],
            enrolled_at: '2026-07-17T13:00:00.000Z',
          },
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
      endpoint: {
        agentId: 'mine',
        agentType: 'endpoint',
        packages: ['endpoint'],
        status: 'healthy',
      },
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

  it('returns not_found when a truncated page holds only hidden candidates', async () => {
    // Spaces are a security boundary: Fleet returns a FULL page (so more
    // records may exist beyond it) and reports a total, but every fetched
    // agent is filtered out by space visibility. Answering `ambiguous` here
    // would leak that matching records exist in other Spaces; a false
    // negative for a visible agent beyond the hard cap is accepted instead.
    const listAgents = jest.fn(async ({ page }: { page: number }) => ({
      agents: Array.from({ length: LOOKUP_PAGE_SIZE }, (_, i) => ({
        id: `hidden-${page}-${i}`,
        status: 'online',
      })),
      total: 500,
    }));

    const { lookup } = buildService({
      listAgents,
      ensureInCurrentSpace: jest.fn().mockRejectedValue(new NotFoundError('Agent not found')),
    });

    const result = await lookup.resolveByHostName('hidden-but-plentiful-host');

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

  describe('candidate paging', () => {
    it('walks the next page when Fleet reports more matching agents than one page holds', async () => {
      // A host with more enrollment records than one page must still be
      // resolved from the FULL candidate set, not from page 1 alone.
      const listAgents = jest.fn(async ({ page }: { page: number }) =>
        page === 1
          ? {
              agents: Array.from({ length: LOOKUP_PAGE_SIZE }, (_, i) => ({
                id: `stale-${i}`,
                status: 'uninstalled',
                enrolled_at: '2026-07-01T00:00:00.000Z',
              })),
              total: LOOKUP_PAGE_SIZE + 1,
            }
          : {
              agents: [
                {
                  id: 'live-last-page',
                  status: 'online',
                  packages: ['endpoint'],
                  enrolled_at: '2026-07-17T00:00:00.000Z',
                },
              ],
              total: LOOKUP_PAGE_SIZE + 1,
            }
      );

      const { lookup } = buildService({ listAgents });

      const result = await lookup.resolveByHostName('many-records-host');

      expect(result).toHaveProperty('endpoint.agentId', 'live-last-page');
      expect(listAgents).toHaveBeenCalledTimes(2);
      expect(listAgents).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    });

    it('refuses to resolve when more agent records match than the lookup examined', async () => {
      // Every page is full and Fleet reports far more records than the lookup
      // will walk, so an unseen record could be another live machine. Reporting
      // the one visible live agent as THE answer would be a guess.
      const listAgents = jest.fn(async ({ page }: { page: number }) => ({
        agents: Array.from({ length: LOOKUP_PAGE_SIZE }, (_, i) => ({
          id: `page-${page}-agent-${i}`,
          status: 'online',
          packages: ['endpoint'],
        })),
        total: 5000,
      }));

      const { lookup } = buildService({ listAgents });

      const result = await lookup.resolveByHostName('huge-history-host');

      expect(result).toEqual(expect.objectContaining({ kind: 'ambiguous', truncated: true }));
      // Fleet's `total: 500` is not propagated — it counts agents before space
      // filtering, so surfacing it would disclose how many matching records
      // exist in other Spaces.
      expect((result as { totalCandidates?: number }).totalCandidates).toBeUndefined();
      expect((result as { candidates: unknown[] }).candidates).toHaveLength(10);
    });

    it('treats an unreported total as a complete candidate set', async () => {
      // No total means no evidence of further matches — the pre-paging
      // behavior, kept so a backend that does not report totals still resolves.
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'only-agent', status: 'online', packages: ['endpoint'] }],
        }),
      });

      const result = await lookup.resolveByHostName('plain-host');

      expect(result).toHaveProperty('endpoint.agentId', 'only-agent');
    });

    it('batches the space check per page', async () => {
      // One ensureInCurrentSpace call per page keeps the walk cheap; the
      // per-agent fallback only runs when the batch check rejects the page.
      const { lookup, ensureInCurrentSpace } = buildService({
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-1', status: 'online', packages: ['endpoint'] }],
        }),
      });

      const result = await lookup.resolveByHostName('batched-host');

      expect(result).toHaveProperty('endpoint.agentId', 'agent-1');
      expect(ensureInCurrentSpace).toHaveBeenCalledTimes(1);
      expect(ensureInCurrentSpace).toHaveBeenCalledWith({ agentIds: ['agent-1'] });
    });

    it('keeps individually visible agents when the batched space check rejects the page', async () => {
      const { lookup, ensureInCurrentSpace } = buildService({
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            { id: 'hidden-live', status: 'online', packages: ['endpoint'] },
            { id: 'visible-live', status: 'online', packages: ['endpoint'] },
          ],
        }),
        ensureInCurrentSpace: jest.fn(async ({ agentIds }: { agentIds: string[] }) => {
          if (agentIds.length > 1) {
            throw new NotFoundError('Agent not found');
          }
          if (agentIds[0] === 'hidden-live') {
            throw new NotFoundError('Agent not found');
          }
        }),
      });

      const result = await lookup.resolveByHostName('mixed-visibility-host');

      expect(result.kind).toBe('found');
      expect(result).toHaveProperty('endpoint.agentId', 'visible-live');
      expect(ensureInCurrentSpace).toHaveBeenCalledTimes(3);
    });

    it('reports the linked-project total when Fleet reports zero for the same hostname', async () => {
      // Fleet is origin-only and reports `total: 0` when it matched nothing,
      // while the linked-project metadata read found the records. Treating that
      // 0 as the candidate count (`fleet.total ?? metadata.total`) would report
      // "0 candidates" for a hostname that genuinely has more than one page.
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({ agents: [], total: 0 }),
        scoped: { isCpsRead: () => true },
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: Array.from({ length: LOOKUP_PAGE_SIZE }, (_, i) => ({
            metadata: { agent: { id: `linked-${i}` } },
            host_status: HostStatus.HEALTHY,
          })),
          total: 4000,
        }),
      });

      const result = await lookup.resolveByHostName('linked-only-host');

      expect(result).toEqual(
        expect.objectContaining({ kind: 'ambiguous', truncated: true, totalCandidates: 4000 })
      );
    });

    it('refuses to resolve when the linked-project metadata page is truncated', async () => {
      const { lookup, getHostMetadataList } = buildService({
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
        scoped: { isCpsRead: () => true },
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: Array.from({ length: LOOKUP_PAGE_SIZE }, (_, i) => ({
            metadata: { agent: { id: `linked-${i}` } },
            host_status: HostStatus.HEALTHY,
          })),
          total: 4000,
        }),
      });

      const result = await lookup.resolveByHostName('linked-host');

      expect(result).toEqual(
        expect.objectContaining({ kind: 'ambiguous', truncated: true, totalCandidates: 4000 })
      );
      expect(getHostMetadataList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 0, pageSize: LOOKUP_PAGE_SIZE }),
        expect.anything()
      );
    });
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
        expect.objectContaining({ kuery: 'united.endpoint.host.hostname: "linked-host"' }),
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

    it('reports ambiguity when two linked-project agents are in `updating` state', async () => {
      // `updating` is a transient, still-reachable state — treating it as not
      // live would silently resolve to another record instead of asking.
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
        scoped: { isCpsRead: () => true },
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            { metadata: { agent: { id: 'linked-a' } }, host_status: HostStatus.UPDATING },
            { metadata: { agent: { id: 'linked-b' } }, host_status: HostStatus.UPDATING },
          ],
          total: 2,
        }),
      });

      const result = await lookup.resolveByHostName('updating-host');

      expect(result.kind).toBe('ambiguous');
      expect(result).toHaveProperty('candidates', [
        { agentId: 'linked-a', status: HostStatus.UPDATING },
        { agentId: 'linked-b', status: HostStatus.UPDATING },
      ]);
    });

    it('prefers the metadata candidate with the newer last_checkin among offline records', async () => {
      // The recency tiebreak must compare Fleet and metadata records fairly:
      // metadata candidates carry `last_checkin` from HostInfo.
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            {
              id: 'fleet-old',
              status: 'offline',
              packages: ['endpoint'],
              enrolled_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
        scoped: { isCpsRead: () => true },
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { agent: { id: 'linked-new' } },
              host_status: HostStatus.OFFLINE,
              last_checkin: '2026-08-01T00:00:00.000Z',
            },
          ],
          total: 1,
        }),
      });

      const result = await lookup.resolveByHostName('offline-host');

      expect(result.kind).toBe('found');
      expect(result).toHaveProperty('endpoint.agentId', 'linked-new');
    });

    it('reads the metadata index on origin when CPS is inactive', async () => {
      // No scoped fan-out, but the origin metadata read still runs: it is the
      // exact Defend hostname source (see the FQDN case below).
      const { lookup, getHostMetadataList } = buildService({
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
        scoped: { isCpsRead: () => false },
      });

      expect(await lookup.resolveByHostName('missing-host')).toEqual({ kind: 'not_found' });
      expect(getHostMetadataList).toHaveBeenCalledWith(
        expect.objectContaining({ kuery: 'united.endpoint.host.hostname: "missing-host"' }),
        expect.objectContaining({ isCpsRead: expect.any(Function) })
      );
    });

    it('reads the metadata index on origin when no scoped services were supplied', async () => {
      const { lookup, getHostMetadataList } = buildService({
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
      });

      expect(await lookup.resolveByHostName('missing-host')).toEqual({ kind: 'not_found' });
      expect(getHostMetadataList).toHaveBeenCalledWith(
        expect.objectContaining({ kuery: 'united.endpoint.host.hostname: "missing-host"' }),
        undefined
      );
    });

    it('resolves the short Defend hostname when Fleet stores the FQDN', async () => {
      // FQDN hostname format: Elastic Agent writes the FQDN to Fleet's
      // `local_metadata.host.name`, Defend keeps the short OS hostname in
      // `host.hostname`. `list_endpoints` shows the short name, so it must
      // resolve without CPS.
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { elastic: { agent: { id: 'fleet-web01' } }, agent: { id: 'ep-web01' } },
              host_status: HostStatus.HEALTHY,
            },
          ],
          total: 1,
        }),
      });

      const result = await lookup.resolveByHostName('web01');

      expect(result.kind).toBe('found');
      expect(result).toHaveProperty('endpoint.agentId', 'fleet-web01');
      expect(result).toHaveProperty('endpoint.agentType', 'endpoint');
    });

    it('does not read the metadata index when the lookup excludes Elastic Defend', async () => {
      const { lookup, getHostMetadataList } = buildService({
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
        agentTypes: ['sentinel_one'],
      });

      expect(await lookup.resolveByHostName('s1-host')).toEqual({ kind: 'not_found' });
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
          { agentId: 'origin-live', status: HostStatus.HEALTHY },
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
        endpoint: {
          agentId: 'agent-1',
          agentType: 'endpoint',
          packages: ['endpoint'],
          status: 'healthy',
        },
      });
    });

    it('reports the Fleet agent id for metadata candidates when the endpoint id differs', async () => {
      // On current agents the endpoint's own `agent.id` and the Fleet agent id
      // (`elastic.agent.id`) diverge. Candidates must carry the Fleet id — it
      // is the identity actions and downstream Fleet-id-filtered reads key on.
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({ agents: [] }),
        scoped: { isCpsRead: () => true },
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { agent: { id: 'endpoint-9' }, elastic: { agent: { id: 'fleet-1' } } },
              host_status: HostStatus.HEALTHY,
            },
          ],
          total: 1,
        }),
      });

      const result = await lookup.resolveByHostName('linked-host');

      expect(result.kind).toBe('found');
      expect(result).toHaveProperty('endpoint.agentId', 'fleet-1');
    });

    it('does not double-count a host whose Fleet id and endpoint id differ', async () => {
      // Fleet returns the host under its Fleet id; the scoped metadata index
      // returns the same host with a DIFFERENT endpoint `agent.id` but the
      // same Fleet id in `elastic.agent.id`. Comparing across identities
      // would report one live host as two candidates (false ambiguity).
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-1', status: 'online', packages: ['endpoint'] }],
        }),
        scoped: { isCpsRead: () => true },
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { agent: { id: 'endpoint-9' }, elastic: { agent: { id: 'agent-1' } } },
              host_status: HostStatus.HEALTHY,
            },
          ],
          total: 1,
        }),
      });

      const result = await lookup.resolveByHostName('shared-host');

      expect(result).toEqual({
        kind: 'found',
        endpoint: {
          agentId: 'agent-1',
          agentType: 'endpoint',
          packages: ['endpoint'],
          status: 'healthy',
        },
      });
    });
  });

  describe('gone agents and package parity', () => {
    it.each(['unenrolled', 'uninstalled'])(
      'resolveByHostName reports an only-%s match with an unenrolled status instead of a live one',
      async (fleetStatus) => {
        const { lookup } = buildService({
          listAgents: jest.fn().mockResolvedValue({
            agents: [{ id: 'gone-agent', status: fleetStatus, packages: ['endpoint'] }],
          }),
        });

        const result = await lookup.resolveByHostName('retired-host');

        expect(result).toEqual({
          kind: 'found',
          endpoint: expect.objectContaining({
            agentId: 'gone-agent',
            status: HostStatus.UNENROLLED,
          }),
        });
      }
    );

    it('does not offer a Defend metadata id whose Fleet agent has no supported integration', async () => {
      // `no-package` matches the hostname in Fleet but is filtered out (no
      // response-action integration), while its metadata doc still matches.
      // Offering it as an ambiguity candidate sends the model to retry with an
      // id that `resolveByAgentId` answers `endpoint_not_found` for.
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({
          agents: [
            { id: 'no-package', status: 'online', packages: ['system'] },
            { id: 'real-endpoint', status: 'online', packages: ['endpoint'] },
          ],
        }),
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { elastic: { agent: { id: 'no-package' } } },
              host_status: HostStatus.HEALTHY,
            },
          ],
          total: 1,
        }),
      });

      const result = await lookup.resolveByHostName('shared-host');

      expect(result).toEqual({
        kind: 'found',
        endpoint: expect.objectContaining({ agentId: 'real-endpoint' }),
      });
    });

    it('still offers a metadata-only candidate Fleet has no record of', async () => {
      const { lookup } = buildService({
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'real-endpoint', status: 'online', packages: ['endpoint'] }],
        }),
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { elastic: { agent: { id: 'linked-only' } } },
              host_status: HostStatus.HEALTHY,
            },
          ],
          total: 1,
        }),
      });

      const result = await lookup.resolveByHostName('shared-host');

      expect(result.kind).toBe('ambiguous');
    });
  });

  describe('agent-type scoping', () => {
    it('excludes third-party EDR agents when the caller scopes the lookup to Defend', async () => {
      // A tool whose follow-up read only covers Elastic Defend (e.g. a status
      // read backed by the Defend metadata index) must not resolve a
      // SentinelOne/CrowdStrike/MDE agent — the read can never find it, and
      // the host would be misreported as not-found.
      const { lookup } = buildService({
        agentTypes: ['endpoint'],
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-s1', status: 'online', packages: ['sentinel_one'] }],
        }),
      });

      const result = await lookup.resolveByHostName('s1-host');

      expect(result).toEqual({ kind: 'not_found' });
    });

    it('still resolves Defend agents when scoped to Defend', async () => {
      const { lookup } = buildService({ agentTypes: ['endpoint'] });

      const result = await lookup.resolveByHostName('defend-host');

      expect(result).toEqual({
        kind: 'found',
        endpoint: {
          agentId: 'agent-1',
          agentType: 'endpoint',
          packages: ['endpoint'],
          status: 'healthy',
        },
      });
    });

    it('excludes m365_defender-package agents when scoped to Defend', async () => {
      const { lookup } = buildService({
        agentTypes: ['endpoint'],
        listAgents: jest.fn().mockResolvedValue({
          agents: [{ id: 'agent-mde', status: 'online', packages: ['m365_defender'] }],
        }),
      });

      const result = await lookup.resolveByHostName('mde-host');

      expect(result).toEqual({ kind: 'not_found' });
    });
  });

  describe('resolveByIp', () => {
    it('queries united endpoint metadata by exact IP and returns one live endpoint', async () => {
      const getHostMetadataList = jest.fn().mockResolvedValue({
        data: [
          {
            metadata: {
              elastic: { agent: { id: 'agent-ip' } },
              host: { hostname: 'ip-host', os: { platform: 'linux' } },
            },
            host_status: HostStatus.HEALTHY,
            policy_info: { agent: { configured: { id: 'agent-policy-ip' } } },
          },
        ],
        total: 1,
      });
      const { lookup } = buildService({ getHostMetadataList });

      await expect(lookup.resolveByIp('10.0.0.7')).resolves.toEqual({
        kind: 'found',
        endpoint: {
          agentId: 'agent-ip',
          agentType: 'endpoint',
          packages: ['endpoint'],
          status: HostStatus.HEALTHY,
          hostName: 'ip-host',
          platform: 'linux',
          policyId: 'agent-policy-ip',
        },
      });
      expect(getHostMetadataList).toHaveBeenCalledWith(
        expect.objectContaining({ kuery: 'united.endpoint.host.ip: "10.0.0.7"' }),
        undefined
      );
    });

    it('keeps the newest live document when deduplicating metadata for one agent', async () => {
      const { lookup } = buildService({
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { elastic: { agent: { id: 'agent-a' } } },
              host_status: HostStatus.OFFLINE,
              // Newer but offline: liveness must outrank recency.
              last_checkin: '2026-10-20T12:00:00.000Z',
            },
            {
              metadata: { elastic: { agent: { id: 'agent-a' } } },
              host_status: HostStatus.HEALTHY,
              last_checkin: '2026-10-20T11:00:00.000Z',
            },
          ],
          total: 2,
        }),
      });

      await expect(lookup.resolveByIp('10.0.0.9')).resolves.toMatchObject({
        kind: 'found',
        endpoint: { agentId: 'agent-a', status: HostStatus.HEALTHY },
      });
    });

    it('returns ambiguity rather than guessing when an IP belongs to two live endpoints', async () => {
      const { lookup } = buildService({
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { elastic: { agent: { id: 'agent-a' } } },
              host_status: HostStatus.HEALTHY,
            },
            {
              metadata: { elastic: { agent: { id: 'agent-b' } } },
              host_status: HostStatus.HEALTHY,
            },
          ],
          total: 2,
        }),
      });

      expect(await lookup.resolveByIp('10.0.0.8')).toEqual({
        kind: 'ambiguous',
        candidates: [
          { agentId: 'agent-a', status: HostStatus.HEALTHY },
          { agentId: 'agent-b', status: HostStatus.HEALTHY },
        ],
      });
    });

    it('deduplicates historical metadata documents for the same agent', async () => {
      const { lookup } = buildService({
        getHostMetadataList: jest.fn().mockResolvedValue({
          data: [
            {
              metadata: { elastic: { agent: { id: 'agent-a' } } },
              host_status: HostStatus.OFFLINE,
            },
            {
              metadata: { elastic: { agent: { id: 'agent-a' } } },
              host_status: HostStatus.HEALTHY,
            },
          ],
          total: 2,
        }),
      });

      expect(await lookup.resolveByIp('10.0.0.9')).toHaveProperty('kind', 'found');
    });
  });

  describe('resolveByAgentId', () => {
    const buildByIdService = (
      agent: Record<string, unknown> | Error,
      ensure?: jest.Mock,
      metadata?: jest.Mock
    ) => {
      const getAgent = jest.fn();
      if (agent instanceof Error) {
        getAgent.mockRejectedValue(agent);
      } else {
        getAgent.mockResolvedValue(agent);
      }
      const ensureInCurrentSpace = ensure ?? jest.fn().mockResolvedValue(undefined);
      const getHostMetadataList = metadata ?? jest.fn().mockResolvedValue({ data: [], total: 0 });
      const endpointAppContextService = {
        getInternalFleetServices: jest.fn(() => ({
          agent: { listAgents: jest.fn(), getAgent },
          ensureInCurrentSpace,
        })),
        getEndpointMetadataService: jest.fn(() => ({ getHostMetadataList })),
      } as unknown as EndpointAppContextService;

      return {
        lookup: createEndpointLookupService(endpointAppContextService, spaceId),
        getAgent,
        ensureInCurrentSpace,
        getHostMetadataList,
      };
    };

    it('resolves the agent, its agentType and its Fleet hostname after the space check', async () => {
      const { lookup, ensureInCurrentSpace, getAgent } = buildByIdService({
        id: 'agent-s1',
        packages: ['sentinel_one'],
        local_metadata: { host: { name: 'sentinel-host' } },
      });

      const result = await lookup.resolveByAgentId('agent-s1');

      expect(ensureInCurrentSpace).toHaveBeenCalledWith({ agentIds: ['agent-s1'] });
      expect(getAgent).toHaveBeenCalledWith('agent-s1');
      expect(result).toEqual({
        kind: 'found',
        endpoint: {
          agentId: 'agent-s1',
          agentType: 'sentinel_one',
          packages: ['sentinel_one'],
          hostName: 'sentinel-host',
        },
      });
    });

    it('answers not_found for an agent outside the current space without reading it', async () => {
      const { lookup, getAgent } = buildByIdService(
        { id: 'agent-x', packages: ['endpoint'] },
        jest.fn().mockRejectedValue(new NotFoundError('not in space'))
      );

      expect(await lookup.resolveByAgentId('agent-x')).toEqual({ kind: 'not_found' });
      expect(getAgent).not.toHaveBeenCalled();
    });

    it('propagates a non-NotFound space-check failure instead of reporting not_found', async () => {
      const { lookup } = buildByIdService(
        { id: 'agent-x', packages: ['endpoint'] },
        jest.fn().mockRejectedValue(new Error('fleet unavailable'))
      );

      await expect(lookup.resolveByAgentId('agent-x')).rejects.toThrow('fleet unavailable');
    });

    it('answers not_found for an agent without a response-action integration', async () => {
      const { lookup } = buildByIdService({ id: 'agent-sys', packages: ['system'] });

      expect(await lookup.resolveByAgentId('agent-sys')).toEqual({ kind: 'not_found' });
    });

    it.each([
      ['unenrolled', HostStatus.UNENROLLED],
      ['uninstalled', HostStatus.UNENROLLED],
      ['online', HostStatus.HEALTHY],
    ])('reports a %s agent with the %s host status', async (fleetStatus, hostStatus) => {
      const { lookup } = buildByIdService({
        id: 'agent-b',
        status: fleetStatus,
        packages: ['endpoint'],
      });

      const result = await lookup.resolveByAgentId('agent-b');

      expect(result).toEqual({
        kind: 'found',
        endpoint: expect.objectContaining({ agentId: 'agent-b', status: hostStatus }),
      });
    });

    it("also returns the agent's Defend metadata hostnames, read by its own id", async () => {
      const getHostMetadataList = jest.fn().mockResolvedValue({
        data: [
          {
            metadata: {
              elastic: { agent: { id: 'agent-b' } },
              host: { hostname: 'web-01', name: 'web-01' },
            },
          },
        ],
        total: 1,
      });
      const { lookup } = buildByIdService(
        {
          id: 'agent-b',
          packages: ['endpoint'],
          local_metadata: { host: { name: 'web-01.example.com' } },
        },
        undefined,
        getHostMetadataList
      );

      const result = await lookup.resolveByAgentId('agent-b');

      expect(result).toEqual({
        kind: 'found',
        endpoint: {
          agentId: 'agent-b',
          agentType: 'endpoint',
          packages: ['endpoint'],
          hostName: 'web-01.example.com',
          defendHostNames: ['web-01'],
        },
      });
      // Keyed on the Fleet agent id (endpoint's own id as legacy fallback), so
      // the read cannot return another agent's names.
      expect(getHostMetadataList).toHaveBeenCalledWith(
        expect.objectContaining({
          kuery: '(united.agent.agent.id: "agent-b" OR agent.id: "agent-b")',
        }),
        undefined
      );
    });

    it('resolves the agent even when the Defend metadata identity read fails', async () => {
      const { lookup } = buildByIdService(
        {
          id: 'agent-b',
          packages: ['endpoint'],
          local_metadata: { host: { name: 'web-01.example.com' } },
        },
        undefined,
        jest.fn().mockRejectedValue(new Error('metadata index unavailable'))
      );

      expect(await lookup.resolveByAgentId('agent-b')).toEqual({
        kind: 'found',
        endpoint: {
          agentId: 'agent-b',
          agentType: 'endpoint',
          packages: ['endpoint'],
          hostName: 'web-01.example.com',
        },
      });
    });

    it('does not read the Defend metadata for a non-Defend agent', async () => {
      const { lookup, getHostMetadataList } = buildByIdService({
        id: 'agent-s1',
        packages: ['sentinel_one'],
        local_metadata: { host: { name: 'sentinel-host' } },
      });

      await lookup.resolveByAgentId('agent-s1');

      expect(getHostMetadataList).not.toHaveBeenCalled();
    });

    it('honours the agentTypes scope on the ID path', async () => {
      const getAgent = jest.fn().mockResolvedValue({ id: 'agent-s1', packages: ['sentinel_one'] });
      const endpointAppContextService = {
        getInternalFleetServices: jest.fn(() => ({
          agent: { listAgents: jest.fn(), getAgent },
          ensureInCurrentSpace: jest.fn().mockResolvedValue(undefined),
        })),
        getEndpointMetadataService: jest.fn(),
      } as unknown as EndpointAppContextService;
      const lookup = createEndpointLookupService(
        endpointAppContextService,
        spaceId,
        undefined as never,
        { agentTypes: ['endpoint'] }
      );

      expect(await lookup.resolveByAgentId('agent-s1')).toEqual({ kind: 'not_found' });
    });
  });
});
