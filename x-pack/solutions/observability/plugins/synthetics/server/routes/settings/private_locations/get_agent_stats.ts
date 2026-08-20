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
import type { AgentStat, LocationAgentStats } from '../../../../common/types';

const BYTES_PER_MIB = 1024 * 1024;

interface EnrolledAgentMeta {
  /** Fleet agent id (unique). Map key. */
  agentId: string;
  /**
   * Original-case `host.name` (or hostname) for display and metrics join.
   * Empty when the agent reports no host metadata.
   */
  host: string;
  lastCheckin: number | null;
  /** Total host RAM (MiB) from agent metadata, or null when not reported. */
  memoryMib: number | null;
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
 * One entry per enrolled Fleet agent (`agent.id`) on the location's policy.
 * Host memory from agent metadata is optional; `metrics-system.*` fills gaps.
 */
const getEnrolledAgents = async (
  server: SyntheticsServerSetup,
  agentPolicyId: string
): Promise<Map<string, EnrolledAgentMeta>> => {
  const byId = new Map<string, EnrolledAgentMeta>();

  const perPage = 1000;
  // Bound pagination on Fleet's `total`, with a hard page cap so a misbehaving
  // paginator can't spin forever. Stays within ES's default 10k `from + size`.
  const MAX_PAGES = 10;
  let page = 1;
  let total = Infinity;
  let fetched = 0;

  while (fetched < total && page <= MAX_PAGES) {
    const { agents, total: totalAgents } =
      await server.fleet.agentService.asInternalUser.listAgents({
        showInactive: true,
        perPage,
        page,
        kuery: `policy_id:"${agentPolicyId}"`,
      });
    total = totalAgents ?? agents.length;

    for (const agent of agents) {
      if (!agent.id) {
        continue;
      }
      const meta = agent.local_metadata as AgentLocalMetadata | undefined;
      const hostMeta = meta?.host;
      const host = hostMeta?.name ?? hostMeta?.hostname ?? '';
      const last = agent.last_checkin ? Date.parse(agent.last_checkin) : NaN;
      const lastCheckin = Number.isNaN(last) ? null : last;
      const memoryMib =
        typeof hostMeta?.memory === 'number' && hostMeta.memory > 0
          ? Math.round(hostMeta.memory / BYTES_PER_MIB)
          : null;

      byId.set(agent.id, {
        agentId: agent.id,
        host,
        lastCheckin,
        memoryMib,
        agentVersion: meta?.elastic?.agent?.version ?? null,
        agentStatus: agent.status ?? null,
        policyRevision: agent.policy_revision ?? null,
        lastCheckinMessage: agent.last_checkin_message ?? null,
        platform: meta?.os?.platform ?? meta?.os?.name ?? null,
        tags: agent.tags ?? [],
      });
    }

    fetched += agents.length;
    if (agents.length === 0) {
      break;
    }
    page += 1;
  }

  return byId;
};

interface HostMetrics {
  totalMib: number | null;
  usedMib: number | null;
  usedPct: number | null;
  cpuPct: number | null;
}

/**
 * Host memory/CPU from `metrics-system.*`, keyed by lowercased `host.name`.
 * Query uses original-case names (keyword is case-sensitive).
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
 * Per-agent health and host metrics for every private location's agent policy —
 * one row per Fleet `agent.id`. Identity/health from Fleet; RAM/CPU from System
 * integration when available (else "N/A").
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

    const { elasticsearch } = await context.core;
    const esClient = elasticsearch.client.asCurrentUser;

    return Promise.all(
      locations.map(async (location): Promise<LocationAgentStats> => {
        const enrolled = await getEnrolledAgents(server, location.agentPolicyId).catch(
          () => new Map<string, EnrolledAgentMeta>()
        );

        // Unique original-case host names for the metrics terms query.
        const metricHostNames = [
          ...new Set(
            [...enrolled.values()].map((meta) => meta.host).filter((name): name is string => !!name)
          ),
        ];
        const metrics = await getHostMetricsFromSystem(esClient, metricHostNames).catch(
          () => new Map<string, HostMetrics>()
        );

        const agents = [...enrolled.values()]
          .map((meta): AgentStat => {
            const hostMetrics = meta.host ? metrics.get(meta.host.toLowerCase()) : undefined;
            const totalMemoryMib = meta.memoryMib ?? hostMetrics?.totalMib ?? null;
            const usedMemoryMib =
              hostMetrics?.usedMib != null && totalMemoryMib != null
                ? Math.min(hostMetrics.usedMib, totalMemoryMib)
                : hostMetrics?.usedMib ?? null;
            return {
              host: meta.host,
              lastCheckin: meta.lastCheckin,
              healthy: meta.agentStatus === 'online',
              totalMemoryMib,
              usedMemoryMib,
              usedMemoryPct: hostMetrics?.usedPct ?? null,
              cpuPct: hostMetrics?.cpuPct ?? null,
              agentId: meta.agentId,
              agentVersion: meta.agentVersion,
              agentStatus: meta.agentStatus,
              policyRevision: meta.policyRevision,
              lastCheckinMessage: meta.lastCheckinMessage,
              platform: meta.platform,
              tags: meta.tags,
            };
          })
          .sort((a, b) => {
            const hostCmp = a.host.localeCompare(b.host);
            return hostCmp !== 0 ? hostCmp : (a.agentId ?? '').localeCompare(b.agentId ?? '');
          });

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
