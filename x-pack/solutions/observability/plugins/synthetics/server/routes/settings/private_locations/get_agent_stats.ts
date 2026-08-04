/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import type { SyntheticsServerSetup } from '../../../types';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';

const BYTES_PER_MIB = 1024 * 1024;

export interface AgentStat {
  /** Agent `host.name` (lowercased). */
  host: string;
  lastCheckin: number | null;
  /** Whether Fleet reports the agent as online. */
  healthy: boolean;
  /**
   * Total host RAM (MiB), from agent metadata (`host.memory`) or, as a fallback,
   * `system.memory.total` in `metrics-system.memory-*`. Null when neither source
   * is available (UI shows "N/A").
   */
  totalMemoryMib: number | null;
  /**
   * Used host RAM (MiB) and fraction used (0..1), from `system.memory.actual.used.*`
   * in `metrics-system.memory-*` (System integration only). Null when unavailable.
   */
  usedMemoryMib: number | null;
  usedMemoryPct: number | null;
  /**
   * Normalized host CPU usage (0..1) from `system.cpu.total.norm.pct` in
   * `metrics-system.cpu-*` (System integration only). Null when unavailable.
   */
  cpuPct: number | null;
  /** Fleet agent identity/metadata for the freshest agent on this host, powering the flyout. */
  agentId: string | null;
  agentVersion: string | null;
  agentStatus: string | null;
  policyRevision: number | null;
  lastCheckinMessage: string | null;
  platform: string | null;
  tags: string[];
}

export interface LocationAgentStats {
  locationId: string;
  locationLabel: string;
  agentPolicyId: string;
  /** Agent policy display name, or the id when the policy can't be resolved. */
  agentPolicyName: string;
  agents: AgentStat[];
}

interface AgentHostMeta {
  /**
   * Original-case `host.name`. The map is keyed by the lowercased name (to dedupe
   * agents sharing a host), but `metrics-system.*` stores `host.name` as a
   * case-sensitive keyword, so the metrics lookup must query the original case.
   */
  name: string;
  lastCheckin: number | null;
  /** Total host RAM (MiB) from agent metadata, or null when the agent doesn't report it. */
  memoryMib: number | null;
  agentId: string | null;
  agentVersion: string | null;
  agentStatus: string | null;
  policyRevision: number | null;
  lastCheckinMessage: string | null;
  platform: string | null;
  tags: string[];
}

interface AgentLocalMetadata {
  host?: { name?: string; hostname?: string; memory?: number };
  os?: { platform?: string; name?: string };
  elastic?: { agent?: { version?: string } };
}

/**
 * Per enrolled agent host (keyed by lowercased `host.name`): freshest
 * `last_checkin`, total host RAM, and the identity/metadata of the freshest
 * agent (id, version, status, policy revision, platform, tags) for the flyout.
 *
 * `host.memory` is reported by every agent that ships elastic/elastic-agent#15708
 * (host total RAM in agent metadata) — no System integration required. Older
 * agents omit it (null here), and the route then falls back to
 * `metrics-system.memory-*`. When several agents share a host name we keep the
 * freshest check-in (and its identity) and the largest reported memory.
 */
const getEnrolledAgentHosts = async (
  server: SyntheticsServerSetup,
  agentPolicyId: string
): Promise<Map<string, AgentHostMeta>> => {
  const byHost = new Map<string, AgentHostMeta>();

  const perPage = 1000;
  // Bound the pagination on Fleet's authoritative `total`, with a hard page cap
  // as a safety net so a misbehaving paginator (e.g. one that keeps returning
  // full pages) can't spin forever. `perPage * MAX_PAGES` also stays within ES's
  // default 10k `from + size` window, past which `listAgents` would throw.
  const MAX_PAGES = 10;
  let page = 1;
  let total = Infinity;
  let fetched = 0;
  // Paginate: a location's agent policy can hold more than one page of agents,
  // and dropping the overflow would make the UI's per-agent stats, counts and
  // health disagree with reality at scale.
  while (fetched < total && page <= MAX_PAGES) {
    const { agents, total: totalAgents } =
      await server.fleet.agentService.asInternalUser.listAgents({
        showInactive: false,
        perPage,
        page,
        kuery: `policy_id:"${agentPolicyId}"`,
      });
    total = totalAgents ?? agents.length;

    for (const agent of agents) {
      const meta = agent.local_metadata as AgentLocalMetadata | undefined;
      const host = meta?.host;
      const originalName = host?.name ?? host?.hostname;
      const name = originalName?.toLowerCase();
      if (!name || !originalName) {
        continue;
      }
      const last = agent.last_checkin ? Date.parse(agent.last_checkin) : NaN;
      const lastCheckin = Number.isNaN(last) ? null : last;
      const memoryMib =
        typeof host?.memory === 'number' && host.memory > 0
          ? Math.round(host.memory / BYTES_PER_MIB)
          : null;
      const prev = byHost.get(name);
      // Keep the freshest agent's identity when several share a host name.
      const isFresher = (lastCheckin ?? 0) >= (prev?.lastCheckin ?? -1);
      byHost.set(name, {
        name: isFresher ? originalName : prev?.name ?? originalName,
        lastCheckin: Math.max(prev?.lastCheckin ?? 0, lastCheckin ?? 0) || lastCheckin,
        memoryMib: Math.max(prev?.memoryMib ?? 0, memoryMib ?? 0) || null,
        agentId: isFresher ? agent.id : prev?.agentId ?? null,
        agentVersion: isFresher
          ? meta?.elastic?.agent?.version ?? null
          : prev?.agentVersion ?? null,
        agentStatus: isFresher ? agent.status ?? null : prev?.agentStatus ?? null,
        policyRevision: isFresher ? agent.policy_revision ?? null : prev?.policyRevision ?? null,
        lastCheckinMessage: isFresher
          ? agent.last_checkin_message ?? null
          : prev?.lastCheckinMessage ?? null,
        platform: isFresher ? meta?.os?.platform ?? meta?.os?.name ?? null : prev?.platform ?? null,
        tags: isFresher ? agent.tags ?? [] : prev?.tags ?? [],
      });
    }

    fetched += agents.length;
    // Guard against an empty page (or a bad `total`) so the loop always terminates.
    if (agents.length === 0) {
      break;
    }
    page += 1;
  }

  return byHost;
};

interface HostMetrics {
  totalMib: number | null;
  usedMib: number | null;
  usedPct: number | null;
  cpuPct: number | null;
}

/**
 * Host memory (total + used) and CPU per agent host from `metrics-system.memory-*`
 * and `metrics-system.cpu-*` (System integration), keyed by (lowercased)
 * `host.name`. `total` is a fallback for the agent-metadata `host.memory`;
 * `used`/`usedPct`/`cpuPct` are only available here. Values are averaged over a
 * short recent window to smooth per-sample jitter (per-field averages ignore docs
 * from the other metricset, which lack that field). Absent hosts stay "unknown"
 * ("N/A" in the UI) rather than zero.
 *
 * `esClient` must read those data streams; `kibana_system` has no `read` on them,
 * so the route passes the *request user's* client.
 */
const getHostMetricsFromSystem = async (
  esClient: ElasticsearchClient,
  hostNames: string[]
): Promise<Map<string, HostMetrics>> => {
  const byHost = new Map<string, HostMetrics>();
  if (hostNames.length === 0) {
    return byHost;
  }

  const res = await esClient.search<
    unknown,
    {
      by_host: {
        buckets: Array<{
          key: string;
          total?: { value?: number | null };
          used?: { value?: number | null };
          usedPct?: { value?: number | null };
          cpuPct?: { value?: number | null };
        }>;
      };
    }
  >({
    index: 'metrics-system.memory-*,metrics-system.cpu-*',
    // The data streams may not exist (System integration disabled) — don't error.
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 0,
    query: {
      bool: {
        filter: [
          { terms: { 'host.name': hostNames } },
          { range: { '@timestamp': { gte: 'now-10m' } } },
        ],
      },
    },
    aggregations: {
      by_host: {
        terms: { field: 'host.name', size: hostNames.length },
        aggregations: {
          total: { max: { field: 'system.memory.total' } },
          used: { avg: { field: 'system.memory.actual.used.bytes' } },
          usedPct: { avg: { field: 'system.memory.actual.used.pct' } },
          cpuPct: { avg: { field: 'system.cpu.total.norm.pct' } },
        },
      },
    },
  });

  const toMib = (bytes?: number | null): number | null =>
    typeof bytes === 'number' && bytes > 0 ? Math.round(bytes / BYTES_PER_MIB) : null;

  for (const bucket of res.aggregations?.by_host?.buckets ?? []) {
    const usedPct = bucket.usedPct?.value;
    const cpuPct = bucket.cpuPct?.value;
    byHost.set(bucket.key.toLowerCase(), {
      totalMib: toMib(bucket.total?.value),
      usedMib: toMib(bucket.used?.value),
      usedPct: typeof usedPct === 'number' ? usedPct : null,
      cpuPct: typeof cpuPct === 'number' ? cpuPct : null,
    });
  }

  return byHost;
};

/**
 * Enrolled agents, health and host metrics (RAM, memory usage, CPU, last
 * check-in) for every private location's agent policy — powering the expandable
 * per-agent rows and flyouts in the private locations table. Agent identity and
 * health come from Fleet; host memory/CPU come from the System integration where
 * enabled (otherwise "N/A" in the UI).
 */
export const getPrivateLocationAgentStats: SyntheticsRestApiRouteFactory<
  LocationAgentStats[]
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATION_AGENT_STATS,
  validate: {},
  handler: async ({ server, context, savedObjectsClient, syntheticsMonitorClient }) => {
    const { locations, agentPolicies } = await getPrivateLocationsAndAgentPolicies(
      savedObjectsClient,
      syntheticsMonitorClient
    );
    const policyNameById = new Map(agentPolicies.map((policy) => [policy.id, policy.name]));

    // Host RAM/CPU live in `metrics-system.*`, which the internal user can't read
    // — query them as the request user so admins see real values (others "N/A").
    const { elasticsearch } = await context.core;
    const esClient = elasticsearch.client.asCurrentUser;

    return Promise.all(
      locations.map(async (location): Promise<LocationAgentStats> => {
        const enrolledHosts = await getEnrolledAgentHosts(server, location.agentPolicyId).catch(
          () => new Map<string, AgentHostMeta>()
        );

        const hosts = [...enrolledHosts.keys()];
        // `metrics-system.*` stores `host.name` as a case-sensitive keyword, so
        // query the original-case names; results are re-keyed lowercase to join.
        const metricHostNames = [...enrolledHosts.values()].map((meta) => meta.name);
        const metrics = await getHostMetricsFromSystem(esClient, metricHostNames).catch(
          () => new Map<string, HostMetrics>()
        );

        const agents = hosts
          .map((host): AgentStat => {
            const meta = enrolledHosts.get(host);
            const hostMetrics = metrics.get(host);
            const totalMemoryMib = meta?.memoryMib ?? hostMetrics?.totalMib ?? null;
            // Used can momentarily read above total across the two metricsets; cap it.
            const usedMemoryMib =
              hostMetrics?.usedMib != null && totalMemoryMib != null
                ? Math.min(hostMetrics.usedMib, totalMemoryMib)
                : hostMetrics?.usedMib ?? null;
            return {
              host,
              lastCheckin: meta?.lastCheckin ?? null,
              healthy: meta?.agentStatus === 'online',
              totalMemoryMib,
              usedMemoryMib,
              usedMemoryPct: hostMetrics?.usedPct ?? null,
              cpuPct: hostMetrics?.cpuPct ?? null,
              agentId: meta?.agentId ?? null,
              agentVersion: meta?.agentVersion ?? null,
              agentStatus: meta?.agentStatus ?? null,
              policyRevision: meta?.policyRevision ?? null,
              lastCheckinMessage: meta?.lastCheckinMessage ?? null,
              platform: meta?.platform ?? null,
              tags: meta?.tags ?? [],
            };
          })
          .sort((a, b) => a.host.localeCompare(b.host));

        return {
          locationId: location.id,
          locationLabel: location.label,
          agentPolicyId: location.agentPolicyId,
          agentPolicyName: policyNameById.get(location.agentPolicyId) ?? location.agentPolicyId,
          agents,
        };
      })
    );
  },
});
