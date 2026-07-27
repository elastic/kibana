/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server/plugin';
import type { ConcreteTaskInstance, IntervalSchedule } from '@kbn/task-manager-plugin/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import pRetry from 'p-retry';
import { SYNTHETICS_INDEX_PATTERN } from '../../common/constants';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import { getAPIKeyForSyntheticsService } from '../synthetics_service/get_api_key';
import { getFakeKibanaRequest } from '../synthetics_service/utils/fake_kibana_request';
import {
  isConditionShardedLocation,
  isEqlSafeLiteral,
} from '../synthetics_service/private_location/assign_by_condition';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import type { SyntheticsServerSetup } from '../types';

const TASK_TYPE = 'Synthetics:Rebalance-Private-Location-Shards';
export const REBALANCE_SHARDS_TASK_ID = `${TASK_TYPE}-single-instance`;
export const DEFAULT_REBALANCE_SCHEDULE = '1m';

// Agents poll Fleet roughly every 30s. We treat an agent as stale when it hasn't
// checked in within 3 poll intervals. This is time-based (a sustained absence),
// which is both the failure signal and the blip tolerance — far tighter than
// Fleet's built-in offline status (12 intervals ≈ 6 min), whose lag otherwise
// dominates failover time. Kept conservative on purpose: a false eviction of a
// still-live agent risks brief double execution of a monitor.
export const STALE_CHECKIN_MS = 90_000;

// Anti-flap hysteresis: an agent that has just transitioned unhealthy→healthy
// must stay healthy for this long before it becomes eligible to *receive*
// recovery redistribution. Without it, an agent that flaps down↔up faster than
// this window would repeatedly trigger a full-scan cost rebalance onto itself,
// churning Fleet package policies (and re-deploying browser runtimes) on every
// bounce. Kept a few check-in intervals wide so it outlasts transient blips;
// failover (evicting a *dead* agent's monitors) ignores this and stays immediate.
export const RECOVERY_STABILITY_MS = 3 * 60_000;

// Data-plane liveness veto. A Fleet check-in travels the control plane (agent →
// Fleet Server long-poll), which is easily disrupted by proxy idle-timeouts,
// Fleet Server restarts, policy-churn round-trips or network blips — none of
// which stop the agent from actually running monitors and indexing results. So a
// lagging `last_checkin` is a false "dead" signal: evicting such an agent moves
// its monitors while it is still executing them, and the old + new host both run
// the monitor until the old one applies the revised policy (a real at-most-once
// break we reproduced). As a redundant proof-of-life we therefore also ask the
// data plane: has this agent written any `synthetics-*` document recently? If so
// it is provably alive and we must NOT evict it, regardless of check-in age.
//
// This window is only ever used to *keep* an agent (veto an eviction), never to
// trigger one: an agent with no assigned monitors (or only long-schedule ones)
// legitimately writes nothing, so absence of data is ambiguous and falls back to
// the check-in signal. Kept wider than STALE_CHECKIN_MS to tolerate a missed run
// plus scheduling jitter; the cost is that a genuinely dead agent's monitors are
// not re-placed until BOTH its check-in and its data go stale (a bounded
// coverage gap, which is the at-most-once-safe direction).
export const STALE_DATA_MS = 3 * 60_000;

interface RebalanceTaskState {
  /**
   * `${agentPolicyId}:${host}` → epoch ms when the agent's current healthy
   * streak began. An agent absent from the map was not healthy on the previous
   * run, so the next time it is seen healthy its streak (and stability grace
   * window) restarts. Persisted across runs to drive the recovery hysteresis.
   */
  healthySince?: Record<string, number>;
}

const BYTES_PER_MIB = 1024 * 1024;

export interface AgentHostInfo {
  /** Freshest `last_checkin` (epoch ms) for the host. */
  lastCheckin: number;
  /**
   * Total host RAM (MiB) from agent metadata (`host.memory`,
   * elastic/elastic-agent#15708), or null when the agent doesn't report it.
   * Feeds capacity-aware placement so bigger agents take proportionally more
   * load; unknown hosts fall back to uniform capacity in the balancer.
   */
  memoryMib: number | null;
  /**
   * `host.id` (machine UniqueID) of the freshest agent with this host name, so
   * a rewritten condition can pin on both name and id (two agents sharing a
   * hostname would otherwise both match). Null when the agent doesn't report it.
   */
  hostId: string | null;
  /**
   * Fleet `agent.id` of the freshest agent with this host name. Used to correlate
   * the host against `synthetics-*` documents (which carry `agent.id`, not
   * `host.name`) for the data-plane liveness veto. Null when unknown.
   */
  agentId: string | null;
}

/**
 * Per enrolled agent host (for a single agent policy): freshest `last_checkin`
 * and total host RAM. Host names are lowercased to match what the agent's own
 * `host` provider reports for `${host.name}` at runtime (i.e. the value stamped
 * into a monitor's condition). An agent with no parseable check-in is omitted
 * (treated as stale by callers). Read from the same `listAgents` call — no
 * extra query. The internal user can't read `metrics-system.memory-*`, so RAM
 * here comes only from agent metadata (older agents without it stay uniform).
 */
export const getAgentHostInfo = async (
  server: SyntheticsServerSetup,
  agentPolicyId: string
): Promise<Map<string, AgentHostInfo>> => {
  const byHost = new Map<string, AgentHostInfo>();

  const perPage = 1000;
  let page = 1;
  let hasMore = true;
  // Paginate: a location's single agent policy can hold more than one page of
  // agents, and dropping the overflow would silently exclude them as shard
  // targets and from health/capacity.
  while (hasMore) {
    const { agents } = await server.fleet.agentService.asInternalUser.listAgents({
      showInactive: false,
      perPage,
      page,
      kuery: `policy_id:"${agentPolicyId}"`,
    });

    for (const agent of agents) {
      const host = (
        agent.local_metadata as
          | { host?: { name?: string; hostname?: string; memory?: number; id?: string } }
          | undefined
      )?.host;
      const name = (host?.name ?? host?.hostname)?.toLowerCase();
      const last = agent.last_checkin ? Date.parse(agent.last_checkin) : NaN;
      // Skip EQL-unsafe host names: they can't be stamped into a condition, and
      // including them would throw while building rebalance updates (aborting the
      // whole location).
      if (name && isEqlSafeLiteral(name) && !Number.isNaN(last)) {
        const memoryMib =
          typeof host?.memory === 'number' && host.memory > 0
            ? Math.round(host.memory / BYTES_PER_MIB)
            : null;
        const safeId = host?.id && isEqlSafeLiteral(host.id) ? host.id : undefined;
        const prev = byHost.get(name);
        // Keep the id from the freshest check-in for this host name.
        const isFresher = last >= (prev?.lastCheckin ?? -1);
        byHost.set(name, {
          lastCheckin: Math.max(prev?.lastCheckin ?? 0, last),
          memoryMib: memoryMib ?? prev?.memoryMib ?? null,
          hostId: (isFresher ? safeId : undefined) ?? prev?.hostId ?? null,
          agentId: (isFresher ? agent.id : undefined) ?? prev?.agentId ?? null,
        });
      }
    }

    hasMore = agents.length === perPage;
    page += 1;
  }

  // Composite shard key: only hosts with a usable host.id can be pinned uniquely
  // (host.name alone can't disambiguate two agents sharing a hostname). Drop the
  // rest so they aren't offered as shard targets — mirrors getEnrolledAgentHosts.
  for (const [name, info] of byHost) {
    if (info.hostId == null) {
      byHost.delete(name);
    }
  }

  return byHost;
};

/**
 * Data-plane liveness signal: which of the given agents have written a
 * `synthetics-*` document within `windowMs`. A running Heartbeat keeps indexing
 * results even when its Fleet check-in is failing, so a recent write is proof an
 * agent is alive and executing — used to veto a false-positive staleness
 * eviction (see {@link STALE_DATA_MS}).
 *
 * The background task runs as `kibana_system`, which cannot read `synthetics-*`;
 * we therefore query as the synthetics service API key (the same credential
 * Heartbeat uses — it holds `read` on `synthetics-*`). Correlation is on
 * `agent.id` because synthetics documents carry `agent.id`, not `host.name`.
 *
 * Best-effort: any failure (missing/invalid key, query error) returns an empty
 * set so the caller falls back to the check-in signal alone. This never triggers
 * an eviction, only prevents one.
 */
export const getRecentlyActiveAgentIds = async (
  server: SyntheticsServerSetup,
  agentIds: string[],
  windowMs: number,
  now: number
): Promise<Set<string>> => {
  const active = new Set<string>();
  if (agentIds.length === 0) {
    return active;
  }

  try {
    const { apiKey, isValid } = await getAPIKeyForSyntheticsService({ server });
    if (!apiKey || !isValid) {
      return active;
    }

    const esClient = server.coreStart.elasticsearch.client.asScoped(
      getFakeKibanaRequest({ id: apiKey.id, api_key: apiKey.apiKey })
    ).asCurrentUser;

    const result = await esClient.search<unknown, { agents: { buckets: Array<{ key: string }> } }>({
      index: SYNTHETICS_INDEX_PATTERN,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: now - windowMs, format: 'epoch_millis' } } },
            { terms: { 'agent.id': agentIds } },
          ],
        },
      },
      aggs: {
        agents: { terms: { field: 'agent.id', size: agentIds.length } },
      },
    });

    for (const bucket of result.aggregations?.agents.buckets ?? []) {
      active.add(bucket.key);
    }
  } catch (e) {
    server.logger.debug(
      `[RebalancePrivateLocationShardsTask] synthetics-* liveness query failed; ` +
        `falling back to check-in signal only: ${e.message}`
    );
  }

  return active;
};

/**
 * Keeps monitor→agent assignment aligned with the set of healthy agents for
 * scalable (condition-sharded) private locations. Health is derived from raw
 * agent check-ins ({@link getAgentHostInfo}); the assignment itself lives in
 * `rebalanceShards`, which rewrites each moved monitor's `${host.name}`
 * condition. Intentionally separate from the already-overloaded
 * `Synthetics:Sync-Private-Location-Monitors` task.
 */
export class RebalancePrivateLocationShardsTask {
  constructor(
    private readonly serverSetup: SyntheticsServerSetup,
    private readonly syntheticsMonitorClient: SyntheticsMonitorClient
  ) {}

  registerTaskDefinition(taskManager: TaskManagerSetupContract) {
    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Synthetics Rebalance Private Location Shards Task',
        description:
          'Reassigns monitors across the healthy agents of scalable private locations (by rewriting per-monitor host conditions) for at-most-once execution and failover.',
        timeout: '10m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => ({
          run: async () => this.runTask({ taskInstance }),
        }),
      },
    });
  }

  async runTask({ taskInstance }: { taskInstance: ConcreteTaskInstance }): Promise<{
    state: Record<string, unknown>;
    schedule?: IntervalSchedule;
  }> {
    const { coreStart, logger } = this.serverSetup;
    const { privateLocationAPI } = this.syntheticsMonitorClient;
    const interval =
      (taskInstance.schedule as IntervalSchedule | undefined)?.interval ??
      DEFAULT_REBALANCE_SCHEDULE;
    const schedule = { interval };

    try {
      const soClient = coreStart.savedObjects.createInternalRepository();
      const allPrivateLocations = await getPrivateLocations(soClient, ALL_SPACES_ID);
      const scalableLocations = allPrivateLocations.filter(isConditionShardedLocation);

      if (scalableLocations.length === 0) {
        return { state: taskInstance.state, schedule };
      }

      const now = Date.now();
      // Recovery hysteresis (anti-flap): carry each agent's healthy streak across
      // runs so a host only becomes eligible to *receive* recovery work once it
      // has stayed healthy for RECOVERY_STABILITY_MS. Rebuilt each run for the
      // currently-healthy hosts; a host that drops out is forgotten so its streak
      // restarts on the next recovery.
      const priorHealthySince =
        (taskInstance.state as RebalanceTaskState | undefined)?.healthySince ?? {};
      const nextHealthySince: Record<string, number> = {};

      for (const location of scalableLocations) {
        let hostInfo: Map<string, AgentHostInfo>;
        try {
          hostInfo = await getAgentHostInfo(this.serverSetup, location.agentPolicyId);
        } catch (e) {
          this.debugLog(
            `Agent check-in query failed for location ${location.id}; skipping: ${e.message}`
          );
          continue;
        }

        // Redundant liveness: an agent whose check-in is stale but which is still
        // writing synthetics results is provably alive — keep it (veto eviction)
        // so we don't move monitors it is still running (which would double-run
        // them). Absence of data is ambiguous (idle/slow-schedule/dead), so it
        // never triggers an eviction; only a stale check-in does.
        const agentIds = [...hostInfo.values()]
          .map((info) => info.agentId)
          .filter((id): id is string => id != null);
        const activeAgentIds = await getRecentlyActiveAgentIds(
          this.serverSetup,
          agentIds,
          STALE_DATA_MS,
          now
        );

        const healthyHosts = [...hostInfo.entries()]
          .filter(
            ([, info]) =>
              now - info.lastCheckin <= STALE_CHECKIN_MS ||
              (info.agentId != null && activeAgentIds.has(info.agentId))
          )
          .map(([host]) => host);

        // Capacity-aware placement: weight each host by its total RAM so bigger
        // agents take proportionally more load. Hosts without reported memory
        // are omitted and fall back to uniform capacity in the balancer.
        const capacities = new Map<string, number>();
        const hostIds = new Map<string, string>();
        for (const [host, info] of hostInfo) {
          if (info.memoryMib != null) {
            capacities.set(host, info.memoryMib);
          }
          if (info.hostId != null) {
            hostIds.set(host, info.hostId);
          }
        }

        const stableKey = (host: string) => `${location.agentPolicyId}:${host}`;
        for (const host of healthyHosts) {
          const key = stableKey(host);
          // Continue an existing streak, or start one now for a fresh recovery.
          nextHealthySince[key] = priorHealthySince[key] ?? now;
        }
        const recoveryHosts = healthyHosts.filter((host) => {
          const since = nextHealthySince[stableKey(host)];
          return since !== undefined && now - since >= RECOVERY_STABILITY_MS;
        });

        this.debugLog(
          `location ${location.id}: healthy=${healthyHosts.length}, recovery-eligible=${recoveryHosts.length}`
        );

        if (healthyHosts.length === 0) {
          logger.warn(
            `[RebalanceShards] No healthy agents for private location ${location.id} (${location.label}); skipping rebalance.`
          );
          continue;
        }

        // Idempotent: only monitors whose assigned host changed are rewritten.
        // Steady state (all agents healthy) performs zero writes.
        const { total, moved } = await privateLocationAPI.rebalanceShards({
          location,
          healthyHosts,
          recoveryHosts,
          capacities,
          hostIds,
        });

        this.debugLog(
          `Location ${location.id}: moved ${moved}/${total} monitors over ${healthyHosts.length} healthy agents`
        );
      }

      return {
        state: { ...taskInstance.state, healthySince: nextHealthySince },
        schedule,
      };
    } catch (error) {
      logger.error(
        `[RebalanceShards] Rebalance of private location shards failed: ${error.message}`
      );
    }

    return { state: taskInstance.state, schedule };
  }

  start = async () => {
    const {
      pluginsStart: { taskManager },
    } = this.serverSetup;

    let schedule: IntervalSchedule = { interval: DEFAULT_REBALANCE_SCHEDULE };
    try {
      const existingTask = await taskManager.get(REBALANCE_SHARDS_TASK_ID);
      if (existingTask.schedule) {
        schedule = existingTask.schedule as IntervalSchedule;
      }
    } catch (_err) {
      // task doesn't exist yet — default schedule will be used on creation
    }

    await taskManager.ensureScheduled({
      id: REBALANCE_SHARDS_TASK_ID,
      state: {},
      schedule,
      taskType: TASK_TYPE,
      params: {},
    });
    this.debugLog('Rebalance private location shards task scheduled');
  };

  private debugLog = (message: string) => {
    this.serverSetup.logger.debug(`[RebalancePrivateLocationShardsTask] ${message}`);
  };
}

export const runRebalanceShardsTaskSoon = async ({
  server,
  retries = 5,
}: {
  server: SyntheticsServerSetup;
  retries?: number;
}) => {
  try {
    await pRetry(
      async () => {
        await server.pluginsStart.taskManager.runSoon(REBALANCE_SHARDS_TASK_ID);
      },
      { retries }
    );
  } catch (error) {
    server.logger.error(
      `Error scheduling rebalance private location shards task: ${error.message}`,
      {
        error,
      }
    );
  }
};
