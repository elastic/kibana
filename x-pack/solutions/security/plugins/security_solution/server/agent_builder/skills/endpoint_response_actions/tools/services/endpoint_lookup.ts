/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { HostStatus } from '../../../../../../common/endpoint/types';
import type {
  EndpointAppContextService,
  ScopedEndpointServices,
} from '../../../../../endpoint/endpoint_app_context_services';
import { NotFoundError } from '../../../../../endpoint/errors';
import { resolveAgentTypeFromPackages } from '../types';

/**
 * Agent records fetched per page while resolving a hostname. A host keeps one
 * record per enrollment (reinstall, upgrade, re-enrollment), so several can
 * share a hostname; the lookup walks pages instead of trusting one.
 */
export const LOOKUP_PAGE_SIZE = 25;

/**
 * Hard cap on pages walked per hostname (100 candidate records). A host with
 * more records than this cannot be resolved by hostname alone — the lookup
 * reports the truncation instead of answering from a partial set.
 */
export const MAX_LOOKUP_PAGES = 4;

/** Ambiguity candidates returned to the model, newest/most-live first. */
export const MAX_AMBIGUOUS_CANDIDATES = 10;

export interface ResolvedEndpoint {
  agentId: string;
  agentType: ResponseActionAgentType;
  packages: string[];
}

/** A Fleet agent record that matched the hostname but could not be selected. */
export interface EndpointCandidate {
  agentId: string;
  status: string;
}

/**
 * Outcome of a hostname lookup.
 *
 * `ambiguous` is a first-class outcome, not an error: two distinct live
 * machines can legitimately share a hostname, so silently picking one would
 * report — or isolate — the wrong host. Callers must surface the ambiguity
 * and ask for an agent ID instead of guessing.
 *
 * `truncated` marks the case where more agent records match the hostname than
 * the lookup examined, so even a single visible live candidate cannot be
 * reported as the answer.
 */
export type EndpointLookupResult =
  | { kind: 'found'; endpoint: ResolvedEndpoint }
  | { kind: 'not_found' }
  | {
      kind: 'ambiguous';
      candidates: EndpointCandidate[];
      /** Set when the candidate set is known to be incomplete. */
      truncated?: true;
      /** Total matching agent records, when the backend reported it. */
      totalCandidates?: number;
    };

export interface EndpointLookupService {
  resolveByHostName(hostName: string): Promise<EndpointLookupResult>;
}

interface CandidatePage<T> {
  items: T[];
  total?: number;
}

/** Structural view of the Fleet agent fields this lookup reads. */
interface FleetCandidate {
  id: string;
  /** Fleet reports this as optional. */
  status?: string;
  packages?: string[];
  enrolled_at?: string;
}

/** Structural view of the metadata-index fields this lookup reads. */
interface MetadataCandidate {
  metadata?: { agent?: { id?: string } };
  host_status?: string;
}

/**
 * Walks pages until the backend reports it has handed over everything it
 * matched, and reports whether the walk had to stop early. `total` is optional
 * because a backend that does not report it gives no evidence of more results;
 * an unknown total is treated as "nothing further", matching the pre-paging
 * behavior.
 */
async function collectPages<T>(
  fetchPage: (page: number) => Promise<CandidatePage<T>>
): Promise<{ items: T[]; truncated: boolean; total?: number }> {
  const items: T[] = [];
  let total: number | undefined;

  for (let page = 1; page <= MAX_LOOKUP_PAGES; page++) {
    const { items: pageItems, total: pageTotal } = await fetchPage(page);
    items.push(...pageItems);
    total = pageTotal;

    if (pageItems.length < LOOKUP_PAGE_SIZE) {
      break;
    }

    if (pageTotal === undefined || items.length >= pageTotal) {
      break;
    }
  }

  return { items, truncated: total !== undefined && items.length < total, total };
}

/**
 * Resolves a hostname to a single Fleet agent + its response-action `agentType`.
 *
 * Why this service exists:
 * - All five host-lookup tools in this skill repeat the same `listAgents` +
 *   `ensureInCurrentSpace` flow. Consolidating it mirrors the Endpoint team's
 *   own “single search-strategy point” refactor in Osquery/Defend Workflows
 *   (`#274308`) and keeps hostname escaping, space validation, and multi-vendor
 *   `agentType` resolution in one place.
 * - A host can have MULTIPLE agent records over its lifetime (reinstall,
 *   agent upgrade, re-enrollment after a broken install) — Fleet keeps prior
 *   (offline/uninstalled) enrollments around alongside the current one, all
 *   matching the same `local_metadata.host.name`. We walk every matching page
 *   and pick the best match (online first, most recently enrolled as tiebreak)
 *   rather than trusting Fleet's default sort to always put the live agent
 *   first — otherwise isolate/unisolate/status tools can silently act on a
 *   dead agent while reporting success.
 * - Fleet itself is an origin-only service: under cross-project search a host
 *   enrolled in a linked project is absent from it, yet the Endpoint UI (which
 *   reads the united metadata index with request-scoped services) shows it.
 *   When CPS reads are active we ALWAYS also query the scoped metadata index
 *   and reconcile the two candidate sets — not just as a fallback when Fleet
 *   returns zero matches. Two reasons that narrower fallback is wrong:
 *     1. An origin agent can be filtered out by Space visibility, leaving
 *        zero *visible* Fleet matches even though Fleet technically has a
 *        record — the fallback needs to run in that case too.
 *     2. An origin-project agent and a same-named linked-project endpoint can
 *        coexist; querying metadata only when Fleet is empty would silently
 *        prefer the origin host and never detect the collision.
 */
export function createEndpointLookupService(
  endpointAppContextService: EndpointAppContextService,
  spaceId: string,
  scoped?: ScopedEndpointServices
): EndpointLookupService {
  const fleetServices = endpointAppContextService.getInternalFleetServices(spaceId);

  interface NormalizedCandidate {
    agentId: string;
    isLive: boolean;
    status: string;
    packages?: string[];
    enrolledAt?: string;
  }

  interface CandidateCollection {
    candidates: NormalizedCandidate[];
    truncated: boolean;
    total?: number;
  }

  const listVisibleFleetCandidates = async (hostName: string): Promise<CandidateCollection> => {
    const { items, truncated, total } = await collectPages<FleetCandidate>(async (page) => {
      const response = await fleetServices.agent.listAgents({
        showInactive: true,
        kuery: `local_metadata.host.name: ${escapeKuery(hostName)}`,
        page,
        perPage: LOOKUP_PAGE_SIZE,
      });

      return { items: response?.agents ?? [], total: response?.total };
    });

    const visible: NormalizedCandidate[] = [];
    for (const candidate of items) {
      try {
        await fleetServices.ensureInCurrentSpace({ agentIds: [candidate.id] });
        visible.push({
          agentId: candidate.id,
          isLive: candidate.status === 'online',
          status: candidate.status ?? 'unknown',
          packages: candidate.packages,
          enrolledAt: candidate.enrolled_at,
        });
      } catch (e) {
        // A not-found means the agent is not visible in the caller's space:
        // skip it, but do not fail the whole lookup. Anything else (e.g. a
        // transient Fleet/ES failure) is a real error and must propagate
        // rather than be misreported as "host not found".
        if (!(e instanceof NotFoundError)) {
          throw e;
        }
      }
    }

    return { candidates: visible, truncated, total };
  };

  /**
   * Candidates visible only through the request-scoped metadata index — i.e.
   * endpoints enrolled in a linked project, invisible to origin Fleet. Callers
   * merge this with `listVisibleFleetCandidates` rather than treating it as an
   * exclusive fallback.
   */
  const listScopedMetadataCandidates = async (
    hostName: string,
    scopedServices: ScopedEndpointServices
  ): Promise<CandidateCollection> => {
    if (!scopedServices.isCpsRead()) {
      return { candidates: [], truncated: false };
    }

    const metadataService = endpointAppContextService.getEndpointMetadataService(spaceId);

    const { items, truncated, total } = await collectPages<MetadataCandidate>(async (page) => {
      const { data, total: pageTotal } = await metadataService.getHostMetadataList(
        {
          // The metadata service pages from 0, unlike Fleet's 1-based pages.
          page: page - 1,
          pageSize: LOOKUP_PAGE_SIZE,
          kuery: `united.endpoint.host.hostname: ${escapeKuery(hostName)}`,
        },
        scopedServices
      );

      return { items: data ?? [], total: pageTotal };
    });

    const candidates = items
      .map((entry) => ({
        agentId: entry.metadata?.agent?.id,
        // Metadata `host_status` is the HostStatus enum (`healthy`), not
        // Fleet's agent-level `online`.
        isLive: entry.host_status === HostStatus.HEALTHY,
        status: entry.host_status as string,
      }))
      .filter((candidate): candidate is NormalizedCandidate => Boolean(candidate.agentId));

    return { candidates, truncated, total };
  };

  return {
    async resolveByHostName(hostName: string): Promise<EndpointLookupResult> {
      const [fleet, metadata] = await Promise.all([
        listVisibleFleetCandidates(hostName),
        scoped
          ? listScopedMetadataCandidates(hostName, scoped)
          : Promise.resolve<CandidateCollection>({ candidates: [], truncated: false }),
      ]);

      // Fleet is the authority when it has the record — prefer it (it carries
      // `packages`, needed for `agentType`) and only add metadata candidates
      // Fleet doesn't already know about, so a host isn't double-counted.
      const fleetIds = new Set(fleet.candidates.map((c) => c.agentId));
      const merged = [
        ...fleet.candidates,
        ...metadata.candidates.filter((c) => !fleetIds.has(c.agentId)),
      ];

      if (!merged.length) {
        return { kind: 'not_found' };
      }

      const sorted = [...merged].sort((a, b) => {
        const aLive = a.isLive ? 1 : 0;
        const bLive = b.isLive ? 1 : 0;
        if (aLive !== bLive) return bLive - aLive;
        return (b.enrolledAt ?? '').localeCompare(a.enrolledAt ?? '');
      });

      // More than one agent matching the hostname is normal Fleet bookkeeping
      // (re-enrollment, reinstall, agent upgrade) as long as only ONE of them
      // is live. Two live machines genuinely sharing a hostname — including a
      // same-named endpoint in a linked project — is different: picking either
      // one silently would report, or isolate, the wrong host, so surface the
      // ambiguity instead of guessing.
      //
      // An incomplete candidate set is treated the same way for the same
      // reason: an unexamined record could be another live machine, so the
      // lookup refuses to answer rather than resolving from a partial page.
      const live = sorted.filter((c) => c.isLive);
      const truncated = fleet.truncated || metadata.truncated;

      if (truncated || live.length > 1) {
        const toReport = truncated ? sorted : live;
        const totalCandidates = truncated ? fleet.total ?? metadata.total : undefined;

        return {
          kind: 'ambiguous',
          candidates: toReport
            .slice(0, MAX_AMBIGUOUS_CANDIDATES)
            .map((c) => ({ agentId: c.agentId, status: c.status })),
          ...(truncated ? { truncated: true as const } : {}),
          ...(totalCandidates === undefined ? {} : { totalCandidates }),
        };
      }

      const chosen = sorted[0];

      return {
        kind: 'found',
        endpoint: {
          agentId: chosen.agentId,
          agentType: resolveAgentTypeFromPackages(chosen.packages ?? []),
          packages: chosen.packages ?? [],
        },
      };
    },
  };
}
