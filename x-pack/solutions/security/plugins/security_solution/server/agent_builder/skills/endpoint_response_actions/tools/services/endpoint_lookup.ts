/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeQuotes } from '@kbn/es-query';
import type { AgentStatus } from '@kbn/fleet-plugin/common';
import { RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { HostStatus } from '../../../../../../common/endpoint/types';
import type {
  EndpointAppContextService,
  ScopedEndpointServices,
} from '../../../../../endpoint/endpoint_app_context_services';
import { NotFoundError } from '../../../../../endpoint/errors';
import { fleetAgentStatusToEndpointHostStatus } from '../../../../../endpoint/utils/fleet_agent_status_to_endpoint_host_status';
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
  metadata?: {
    /** Endpoint's own id — differs from the Fleet agent id. */
    agent?: { id?: string };
    /** Fleet agent id — the identity actions and Fleet candidates key on. */
    elastic?: { agent?: { id?: string } };
  };
  host_status?: string;
  /** HostInfo `last_checkin` — ISO timestamp used for the recency tiebreak. */
  last_checkin?: string;
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
/**
 * Fleet statuses the shared `fleetAgentStatusToEndpointHostStatus` mapper has
 * no entry for (it falls back to `unhealthy`) although the record is gone, not
 * unhealthy: the metadata path reports them as `unenrolled`. They are exactly
 * the not-live statuses (`isLive`) without a `HostStatus` entry. The shared
 * mapper is left alone because its other caller (`host_status` on the
 * metadata API) would change behavior. `orphaned` stays `unhealthy`: Fleet
 * counts it as an active agent (`ActiveAgentStatuses`), so it is live here too.
 */
const GONE_FLEET_STATUSES: ReadonlySet<string> = new Set(['unenrolled', 'uninstalled']);

const toHostStatus = (status: AgentStatus): HostStatus =>
  GONE_FLEET_STATUSES.has(status)
    ? HostStatus.UNENROLLED
    : fleetAgentStatusToEndpointHostStatus(status);

export function createEndpointLookupService(
  endpointAppContextService: EndpointAppContextService,
  spaceId: string,
  scoped?: ScopedEndpointServices,
  options?: {
    /**
     * Response-action agent types this lookup may resolve. Defaults to every
     * type in `RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES`. Tools whose
     * downstream read only covers Elastic Defend (e.g. a status read backed by
     * the Defend metadata index) MUST pass `['endpoint']` — otherwise a
     * SentinelOne/CrowdStrike/MDE agent can win resolution and the follow-up
     * Defend-metadata read reports a live, healthy host as not-found.
     */
    agentTypes?: ResponseActionAgentType[];
  }
): EndpointLookupService {
  const fleetServices = endpointAppContextService.getInternalFleetServices(spaceId);
  const supportedAgentTypes = options?.agentTypes;

  interface NormalizedCandidate {
    agentId: string;
    isLive: boolean;
    status: string;
    packages?: string[];
    /**
     * ISO timestamp for the newest-first tiebreak. The source differs by
     * candidate origin: `enrolled_at` for Fleet agents, `last_checkin` for
     * Defend metadata entries, so it is only an ordering key, not a
     * last-seen or enrollment time.
     */
    sortKey?: string;
  }

  interface RawFleetAgent {
    id: string;
    status?: string;
    packages?: string[];
    enrolled_at?: string;
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
    const { items, truncated } = await collectPages<RawFleetAgent>(async (page) => {
      const response = await fleetServices.agent.listAgents({
        showInactive: true,
        // Exact match on the `.keyword` subfield: `local_metadata.host.name`
        // is `text`, so a plain value compiles to an analyzed `match` and
        // `web-01` also matches `web-02`/`db-01` (false ambiguity or the
        // wrong agent). Quoting alone only gives `match_phrase` on text.
        kuery: `local_metadata.host.name.keyword: "${escapeQuotes(hostName)}"`,
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

    // This skill acts on response-action-capable endpoints, so agents that
    // merely share the hostname without a supported integration (e.g. an
    // auditing agent) must not surface as candidates — they would otherwise
    // inflate the ambiguity set or win the tiebreak over a real endpoint.
    // When the caller scopes the lookup (`agentTypes`), the package set
    // narrows accordingly.
    const supportedPackages = new Set(
      Object.entries(RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES)
        .filter(
          ([agentType]) =>
            !supportedAgentTypes ||
            supportedAgentTypes.includes(agentType as ResponseActionAgentType)
        )
        .flatMap(([, packageNames]) => packageNames)
    );
    const visible: NormalizedCandidate[] = items
      .filter((candidate) => (candidate.packages ?? []).some((p) => supportedPackages.has(p)))
      .map((candidate) => ({
        agentId: candidate.id,
        // Mirror Fleet's own ActiveAgentStatuses: only records that are
        // definitively gone count as not live — `updating`, `degraded`,
        // `enrolling` and `error` are active machines, so two same-named agents
        // in those states must still surface as `ambiguous` rather than one
        // being silently picked.
        isLive: !['offline', 'inactive', 'unenrolled', 'uninstalled', 'decommissioned'].includes(
          candidate.status ?? ''
        ),
        // Reported in the `HostStatus` vocabulary every other status the tool
        // returns uses (metadata candidates, the found result); `isLive`
        // above stays on the raw Fleet status, where the active/gone
        // distinction is defined.
        status: candidate.status ? toHostStatus(candidate.status as AgentStatus) : 'unknown',
        packages: candidate.packages,
        sortKey: candidate.enrolled_at,
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
   * Candidates from the Defend united metadata index, matched exactly on
   * `united.endpoint.host.hostname` — the hostname `list_endpoints` returns
   * and the status read filters on. Read on origin as well as under CPS:
   * Fleet's `local_metadata.host.name` holds the FQDN when the agent policy
   * hostname format is FQDN, while Defend keeps writing the short OS
   * hostname, so a Fleet-only origin read misses the short name that
   * `list_endpoints` shows. Under CPS the request-scoped read also covers
   * endpoints enrolled in a linked project, which origin Fleet cannot see.
   * Space isolation holds on both paths: `getHostMetadataList` filters to the
   * Defend policies visible in this space. Callers merge this with
   * `listVisibleFleetCandidates` rather than treating it as an exclusive
   * fallback.
   */
  const listMetadataCandidates = async (
    hostName: string,
    scopedServices?: ScopedEndpointServices
  ): Promise<CandidateCollection> => {
    // The metadata index only holds Elastic Defend hosts.
    if (supportedAgentTypes && !supportedAgentTypes.includes('endpoint')) {
      return { candidates: [], truncated: false };
    }

    const metadataService = endpointAppContextService.getEndpointMetadataService(spaceId);

    const { items, truncated, total } = await collectPages<MetadataCandidate>(async (page) => {
      const { data, total: pageTotal } = await metadataService.getHostMetadataList(
        {
          // The metadata service pages from 0, unlike Fleet's 1-based pages.
          page: page - 1,
          pageSize: LOOKUP_PAGE_SIZE,
          // `keyword` field (`strings_as_keyword` in metrics-metadata-united.json): the quoted
          // value is an exact match, so `web-01` cannot match `web-01-copy`.
          kuery: `united.endpoint.host.hostname: "${escapeQuotes(hostName)}"`,
        },
        scopedServices
      );

      return { items: data ?? [], total: pageTotal };
    });

    const candidates: NormalizedCandidate[] = items.flatMap((entry) => {
      // Identity: report the FLEET agent id (`elastic.agent.id`), not the
      // endpoint's own `agent.id`. Fleet candidates key on `candidate.id`
      // (the Fleet id), so carrying the endpoint id here makes the same
      // host appear as TWO distinct candidates when the ids differ (false
      // ambiguity), and downstream reads filtering on the Fleet id miss the
      // metadata doc. Fleet-id-first with the endpoint id as fallback
      // mirrors `EndpointMetadataService.getEnrichedHostMetadata()`.
      const agentId = entry.metadata?.elastic?.agent?.id || entry.metadata?.agent?.id;
      if (!agentId) {
        return [];
      }
      return [
        {
          agentId,
          // Metadata `host_status` is the HostStatus enum, not Fleet's
          // agent-level `online`. Only records that are definitively gone
          // (offline / inactive / unenrolled) count as not live; `updating` and
          // `unhealthy` are still potentially-reachable machines.
          isLive: ![HostStatus.OFFLINE, HostStatus.INACTIVE, HostStatus.UNENROLLED].includes(
            entry.host_status as HostStatus
          ),
          status: entry.host_status as string,
          sortKey: entry.last_checkin,
        },
      ];
    });

    return { candidates, truncated, total };
  };

  return {
    async resolveByHostName(hostName: string): Promise<EndpointLookupResult> {
      const [fleet, metadata] = await Promise.all([
        listVisibleFleetCandidates(hostName),
        listMetadataCandidates(hostName, scoped),
      ]);

      // Fleet is the authority when it has the record — prefer it (it carries
      // `packages`, needed for `agentType`) and only add metadata candidates
      // Fleet doesn't already know about, so a host isn't double-counted.
      const fleetIds = new Set(fleet.candidates.map((c) => c.agentId));
      // Accepted legacy ambiguity: a legacy metadata doc without
      // `elastic.agent.id` falls back to the endpoint's own `agent.id`,
      // which differs from Fleet's id, so one physical host can surface here
      // as two candidates and trip `ambiguous_hostname` even though it's a
      // single machine. Accepted because the failure mode is safe (the
      // analyst disambiguates; no wrong-host read, no leak), legacy docs are
      // transient, and joining on hostname instead would risk merging two
      // genuinely different hosts that happen to share a name.
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
        return (b.sortKey ?? '').localeCompare(a.sortKey ?? '');
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
