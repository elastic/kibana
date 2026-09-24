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
 * Hard cap on pages walked per hostname (500 candidate records). With the
 * per-page batched space check this is effectively unreachable for any real
 * host; it exists so a pathological hostname cannot turn into unbounded
 * Fleet/metadata queries. Beyond the cap the lookup reports ambiguity among
 * the visible candidates rather than a cross-space count (see
 * `resolveByHostName`).
 */
export const MAX_LOOKUP_PAGES = 20;

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
  /**
   * Raw backend page length before space-based visibility filtering.
   *
   * Page termination must be judged on this, never on `items.length`: a page
   * that is full on the backend but has some agents hidden from the caller's
   * space filters down to fewer visible items, and treating that as "the last
   * page" stops the walk early — reporting a matching endpoint on a later page
   * as not-found.
   */
  rawItemCount?: number;
}

/** Structural view of the metadata-index fields this lookup reads. */
interface MetadataCandidate {
  metadata?: { agent?: { id?: string } };
  host_status?: string;
  /** HostInfo `last_checkin` — ISO timestamp used for the recency tiebreak. */
  last_checkin?: string;
}

/**
 * A metadata candidate with its agent id proven present. Narrowed with a
 * plain boolean filter — a type predicate cannot express this, because the
 * predicate's type must be assignable to the (id-optional) mapped type.
 */
interface MetadataCandidateWithAgent extends MetadataCandidate {
  metadata: { agent: { id: string } };
}

/**
 * Walks pages until the backend reports it has handed over everything it
 * matched, and reports whether the walk had to stop early. `total` is optional
 * because a backend that does not report it gives no evidence of more results;
 * an unknown total is treated as "nothing further", matching the pre-paging
 * behavior.
 *
 * The walk tracks the RAW record count, not the accumulated (possibly
 * filtered) `items`: `total` counts pre-filter records, so comparing the
 * filtered length against it would keep the loop running to
 * `MAX_LOOKUP_PAGES` whenever any record was hidden, and `truncated` would
 * then be reported for a hostname that had in fact been fully examined.
 */
async function collectPages<T>(
  fetchPage: (page: number) => Promise<CandidatePage<T>>
): Promise<{ items: T[]; truncated: boolean; total?: number }> {
  const items: T[] = [];
  let total: number | undefined;
  let rawCount = 0;

  for (let page = 1; page <= MAX_LOOKUP_PAGES; page++) {
    const { items: pageItems, total: pageTotal, rawItemCount } = await fetchPage(page);
    items.push(...pageItems);
    total = pageTotal;

    const pageLength = rawItemCount ?? pageItems.length;
    rawCount += pageLength;

    if (pageLength < LOOKUP_PAGE_SIZE) {
      break;
    }

    if (pageTotal === undefined || rawCount >= pageTotal) {
      break;
    }
  }

  return { items, truncated: total !== undefined && rawCount < total, total };
}

/**
 * Totals to report for an incomplete candidate set.
 *
 * Only the collections that were actually truncated contribute: a non-truncated
 * collection was fully examined, so its `total` describes a set already merged
 * into the result rather than a set of unexamined records. Summing just the
 * truncated ones also avoids Fleet's misleading `total: 0` — in the linked
 * project case Fleet sees none of the agents while metadata sees hundreds, so
 * preferring Fleet's number would report `totalCandidates: 0` next to a
 * candidate list that is plainly not empty.
 */
function totalCandidatesOf(
  fleet: { truncated: boolean; total?: number },
  metadata: { truncated: boolean; total?: number }
): { totalCandidates?: number } {
  const totals = [fleet, metadata]
    .filter((collection) => collection.truncated && collection.total !== undefined)
    .map((collection) => collection.total as number);

  if (!totals.length) {
    return {};
  }

  return { totalCandidates: totals.reduce((sum, total) => sum + total, 0) };
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
    /**
     * Most-recent-activity timestamp used for the recency tiebreak:
     * `enrolled_at` for Fleet candidates, `last_checkin` for metadata ones.
     */
    recencyAt?: string;
  }

  interface CandidateCollection {
    candidates: NormalizedCandidate[];
    truncated: boolean;
    total?: number;
  }

  // Space-check each page as it is fetched: the underlying Fleet API takes
  // agentIds[], so one call per page keeps the check cheap. A rejected batch
  // (at least one hidden agent) falls back per-agent WITHIN that page only —
  // a mixed-visibility page costs page-size checks, not the whole walk.
  const listVisibleFleetCandidates = async (hostName: string): Promise<CandidateCollection> => {
    const { items, truncated } = await collectPages(async (page) => {
      const response = await fleetServices.agent.listAgents({
        showInactive: true,
        kuery: `local_metadata.host.name: ${escapeKuery(hostName)}`,
        page,
        perPage: LOOKUP_PAGE_SIZE,
      });
      const pageCandidates = response?.agents ?? [];

      const pageIds = pageCandidates.map((candidate) => candidate.id);
      let visibleIds: Set<string>;
      try {
        await fleetServices.ensureInCurrentSpace({ agentIds: pageIds });
        visibleIds = new Set(pageIds);
      } catch (e) {
        if (!(e instanceof NotFoundError)) {
          // A transient Fleet/ES failure is a real error and must propagate
          // rather than be misreported as "host not found".
          throw e;
        }

        // At least one agent on the page is not visible in the caller's
        // space. Re-check one-by-one to keep the individually visible ones.
        visibleIds = new Set();
        for (const candidate of pageCandidates) {
          try {
            await fleetServices.ensureInCurrentSpace({ agentIds: [candidate.id] });
            visibleIds.add(candidate.id);
          } catch (perAgentError) {
            if (!(perAgentError instanceof NotFoundError)) {
              throw perAgentError;
            }
          }
        }
      }

      return {
        items: pageCandidates.filter((candidate) => visibleIds.has(candidate.id)),
        total: response?.total,
        // Raw backend page length: `items` above is space-filtered, so a page
        // holding any hidden agent would otherwise look like a short (final)
        // page and cut the walk short.
        rawItemCount: pageCandidates.length,
      };
    });

    const visible: NormalizedCandidate[] = items.map((candidate) => ({
      agentId: candidate.id,
      // Mirror Fleet's own ActiveAgentStatuses: only records that are
      // definitively gone count as not live — `updating`, `degraded`,
      // `enrolling` and `error` are active machines, so two same-named agents
      // in those states must still surface as `ambiguous` rather than one
      // being silently picked.
      isLive: !['offline', 'inactive', 'unenrolled', 'uninstalled', 'decommissioned'].includes(
        candidate.status ?? ''
      ),
      status: candidate.status ?? 'unknown',
      packages: candidate.packages,
      recencyAt: candidate.enrolled_at,
    }));

    // `truncated` is safe to keep: it says only "there were more pages", which
    // the caller already learns from the space-filtered candidate list being
    // full. `total` is NOT: `listAgents` counts every matching agent before
    // `ensureInCurrentSpace` drops the ones this caller cannot see, so returning
    // it would let a hostname probe learn how many matching agent records exist
    // in other Spaces. Drop it and let the count be derived from visible data.
    return { candidates: visible, truncated };
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

    const candidates: NormalizedCandidate[] = items
      .filter((entry): entry is MetadataCandidateWithAgent => Boolean(entry.metadata?.agent?.id))
      .map((entry) => ({
        agentId: entry.metadata.agent.id,
        // Metadata `host_status` is the HostStatus enum, not Fleet's
        // agent-level `online`. Only records that are definitively gone
        // (offline / inactive / unenrolled) count as not live; `updating` and
        // `unhealthy` are still potentially-reachable machines.
        isLive: ![HostStatus.OFFLINE, HostStatus.INACTIVE, HostStatus.UNENROLLED].includes(
          entry.host_status as HostStatus
        ),
        status: entry.host_status as string,
        recencyAt: entry.last_checkin,
      }));

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

      // Space isolation first: when the walk hit the hard cap and nothing
      // visible was found, answer `not_found`. Spaces are a security boundary —
      // reporting "we found records but cannot show them" (or a cross-space
      // count) would leak that matching records exist in other Spaces. A
      // false-negative for a visible agent living beyond the cap is accepted
      // for that isolation; the cap is high enough (500 records) that real
      // hostnames never reach it.
      const truncated = fleet.truncated || metadata.truncated;

      if (!merged.length) {
        return { kind: 'not_found' };
      }

      const sorted = [...merged].sort((a, b) => {
        const aLive = a.isLive ? 1 : 0;
        const bLive = b.isLive ? 1 : 0;
        if (aLive !== bLive) return bLive - aLive;
        return (b.recencyAt ?? '').localeCompare(a.recencyAt ?? '');
      });

      // More than one agent matching the hostname is normal Fleet bookkeeping
      // (re-enrollment, reinstall, agent upgrade) as long as only ONE of them
      // is live. Two live machines genuinely sharing a hostname — including a
      // same-named endpoint in a linked project — is different: picking either
      // one silently would report, or isolate, the wrong host, so surface the
      // ambiguity instead of guessing.
      //
      // An incomplete candidate set is treated the same way as a genuine
      // duplicate for the same reason: an unexamined record could be another
      // live machine. This applies only when at least one visible candidate
      // was found — the zero-visibility case is answered `not_found` above so
      // cross-space existence never leaks.
      const live = sorted.filter((c) => c.isLive);

      if (truncated || live.length > 1) {
        const toReport = truncated ? sorted : live;

        return {
          kind: 'ambiguous',
          candidates: toReport
            .slice(0, MAX_AMBIGUOUS_CANDIDATES)
            .map((c) => ({ agentId: c.agentId, status: c.status })),
          ...(truncated ? { truncated: true as const } : {}),
          ...totalCandidatesOf(fleet, metadata),
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
