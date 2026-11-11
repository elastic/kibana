/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { execSync } from 'child_process';
import axios from 'axios';
import https from 'https';
import { Client } from '@elastic/elasticsearch';
import { readKibanaConfig } from '@kbn/observability-synthetics-test-data';
import {
  RECOVERY_STABILITY_MS,
  STALE_CHECKIN_MS,
  STALE_DATA_MS,
} from '../../server/synthetics_service/private_location/plan_rebalance';
import type { AtMostOnceCheckWindow } from '../../server/synthetics_service/private_location/at_most_once_check';
import { findAtMostOnceViolations } from '../../server/synthetics_service/private_location/at_most_once_check';

/**
 * Manual e2e runbook for elastic/kibana#281846's "Failover/recovery" checklist
 * item: kill an enrolled agent of a scalable (condition-sharded) private
 * location, confirm its monitors move to survivors with none dropped and no
 * duplicate execution, then bring it back and confirm the recovery-stability
 * hysteresis (`RECOVERY_STABILITY_MS` in `plan_rebalance.ts`) is honoured.
 *
 * Not CI-gated: it needs a real Fleet-enrolled agent pool (see the docker
 * recipe used to develop this feature) and several minutes of real wall-clock
 * time to observe the task's health/hysteresis timers for real, so it is a
 * runbook a human executes against their own stack rather than a per-PR test.
 *
 * Usage:
 *   node scripts/failover_recovery_check.js \
 *     --location-label "My Scalable Location" \
 *     --policy-id <fleetAgentPolicyId> \
 *     --agent-id <fleetAgentIdToKill> \
 *     --container <dockerContainerName> \
 *     [--monitors 6] [--keep]
 */

interface CliArgs {
  locationLabel: string;
  policyId: string;
  agentId: string;
  container: string;
  monitorCount: number;
  keep: boolean;
}

const parseArgs = (): CliArgs => {
  const argv = process.argv.slice(2);
  const flag = (name: string) => {
    const idx = argv.indexOf(`--${name}`);
    return idx === -1 ? undefined : argv[idx + 1];
  };
  const required = (name: string, value: string | undefined): string => {
    if (!value) {
      throw new Error(`Missing required --${name}`);
    }
    return value;
  };
  return {
    locationLabel: required('location-label', flag('location-label')),
    policyId: required('policy-id', flag('policy-id')),
    agentId: required('agent-id', flag('agent-id')),
    container: required('container', flag('container')),
    monitorCount: Number(flag('monitors') ?? '6'),
    keep: argv.includes('--keep'),
  };
};

// --- Kibana connection (same approach as scripts/tasks/generate_monitors.ts) ---

const isKibanaSystemUser = (username: string | undefined) =>
  username === 'kibana_system' || username === 'kibana_system_user';

const getKibanaConnection = () => {
  let config: Record<string, any> = {};
  try {
    config = readKibanaConfig();
  } catch {
    // fall through to defaults
  }
  const host = process.env.KIBANA_HOST ?? config.server?.host ?? '127.0.0.1';
  const resolvedHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  const port = process.env.KIBANA_PORT ?? config.server?.port ?? 5601;
  const configBasePath: string = process.env.KIBANA_BASE_PATH ?? config.server?.basePath ?? '';
  const sslEnabled = config.server?.ssl?.enabled ?? false;
  const protocol = process.env.KIBANA_PROTOCOL ?? (sslEnabled ? 'https' : 'http');
  let kbnUsername = process.env.KIBANA_USERNAME ?? config.elasticsearch?.username;
  if (isKibanaSystemUser(kbnUsername) || !kbnUsername) {
    kbnUsername = 'elastic';
  }
  const kbnPassword = process.env.KIBANA_PASSWORD ?? config.elasticsearch?.password ?? 'changeme';
  return {
    username: kbnUsername as string,
    password: kbnPassword,
    origin: `${protocol}://${resolvedHost}:${port}`,
    configBasePath,
    isHttps: protocol === 'https',
  };
};

const { username, password, origin, configBasePath, isHttps } = getKibanaConnection();
const auth = { username, password };
const headers = { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' };
const httpsAgent = isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined;

const kibanaUrl = configBasePath ? `${origin}${configBasePath}` : origin;

const request = async (method: string, path: string, data?: any) => {
  try {
    const response = await axios.request({
      data,
      method,
      url: `${kibanaUrl}${path}`,
      auth,
      headers,
      httpsAgent,
    });
    return response.data;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ?? JSON.stringify(error?.response?.data) ?? error?.message;
    throw new Error(msg);
  }
};

// --- Elasticsearch connection (same approach as scripts/tasks/check_at_most_once.ts) ---

const buildEsClient = (): Client => {
  try {
    const config = readKibanaConfig();
    const node = config.elasticsearch?.hosts;
    if (node) {
      const rawUser = config.elasticsearch?.username;
      const esUsername = isKibanaSystemUser(rawUser) || !rawUser ? 'elastic' : rawUser;
      const esPassword = config.elasticsearch?.password;
      const verificationMode = config.elasticsearch?.ssl?.verificationMode;
      return new Client({
        node: Array.isArray(node) ? node[0] : node,
        auth: esUsername && esPassword ? { username: esUsername, password: esPassword } : undefined,
        tls: verificationMode === 'none' ? { rejectUnauthorized: false } : undefined,
      });
    }
  } catch {
    // fall through to defaults
  }
  return new Client({
    node: 'http://localhost:9200',
    auth: { username: 'elastic', password: 'changeme' },
  });
};

// --- Small helpers ---

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class TimeoutError extends Error {}

const poll = async <T>(
  fn: () => Promise<T | undefined>,
  { intervalMs, timeoutMs, label }: { intervalMs: number; timeoutMs: number; label: string }
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await fn();
    if (result !== undefined) {
      return result;
    }
    if (Date.now() >= deadline) {
      throw new TimeoutError(`Timed out after ${timeoutMs}ms waiting for: ${label}`);
    }
    await sleep(intervalMs);
  }
};

/** Distinct `agent.id` values that have written a result for `monitorId` since `sinceIso`. */
const agentsForMonitorSince = async (
  esClient: Client,
  monitorId: string,
  sinceIso: string
): Promise<string[]> => {
  const response = await esClient.esql.query({
    query: `
FROM synthetics-*
| WHERE monitor.id == ?monitorId AND @timestamp >= ?since
| STATS agents = VALUES(agent.id)
`,
    params: [{ monitorId }, { since: sinceIso }] as any,
  });
  const agentsIdx = response.columns.findIndex((column) => column.name === 'agents');
  const value = response.values[0]?.[agentsIdx];
  if (value == null) {
    return [];
  }
  return (Array.isArray(value) ? value : [value]).map(String);
};

const testMonitor = (name: string, locationLabel: string) => ({
  name,
  type: 'http',
  form_monitor_type: 'http',
  urls: 'https://www.elastic.co',
  schedule: { number: '1', unit: 'm' },
  locations: [{ label: locationLabel, isServiceManaged: false }],
  tags: ['failover-recovery-e2e'],
  enabled: true,
  namespace: 'default',
});

const createTestMonitors = async (
  count: number,
  locationLabel: string
): Promise<Array<{ id: string; name: string }>> => {
  const created: Array<{ id: string; name: string }> = [];
  for (let i = 0; i < count; i++) {
    const name = `failover-e2e-${Date.now()}-${i}`;
    const result = await request(
      'post',
      '/api/synthetics/monitors',
      testMonitor(name, locationLabel)
    );
    created.push({ id: result.config_id, name });
    console.log(`  ✓ Created test monitor "${name}" (${result.config_id})`);
  }
  return created;
};

const deleteMonitors = async (monitorIds: string[]) => {
  for (const id of monitorIds) {
    try {
      await request('delete', `/api/synthetics/monitors/${id}`);
    } catch (e: any) {
      console.log(`  ! Failed to delete monitor ${id}: ${e.message}`);
    }
  }
};

const getAgentStatus = async (agentId: string): Promise<string | undefined> => {
  const result = await request('get', `/api/fleet/agents/${agentId}`);
  return result?.item?.status;
};

export const checkFailoverRecovery = async () => {
  const args = parseArgs();
  const esClient = buildEsClient();
  let violationsFound = false;
  let hysteresisViolated = false;

  console.log(
    `Config: policy=${args.policyId} agent=${args.agentId} container=${args.container} ` +
      `location="${args.locationLabel}" monitors=${args.monitorCount}`
  );
  console.log(
    `Rebalance timers: STALE_CHECKIN_MS=${STALE_CHECKIN_MS} STALE_DATA_MS=${STALE_DATA_MS} ` +
      `RECOVERY_STABILITY_MS=${RECOVERY_STABILITY_MS}`
  );

  const testStart = new Date().toISOString();

  console.log('\n=== 1. Creating test monitors ===');
  const monitors = await createTestMonitors(args.monitorCount, args.locationLabel);
  const monitorIds = monitors.map((m) => m.id);

  console.log('\n=== 2. Waiting for initial placement ===');
  const baseline = new Map<string, string[]>();
  await poll(
    async () => {
      let allPlaced = true;
      for (const id of monitorIds) {
        const agents = await agentsForMonitorSince(esClient, id, testStart);
        if (agents.length === 0) {
          allPlaced = false;
        } else {
          baseline.set(id, agents);
        }
      }
      return allPlaced ? true : undefined;
    },
    {
      intervalMs: 5_000,
      timeoutMs: 2 * 60_000,
      label: 'all test monitors to report a check result',
    }
  );
  const onKillTarget = monitorIds.filter((id) => baseline.get(id)?.includes(args.agentId));
  console.log(
    `  ✓ Initial placement observed. ${onKillTarget.length}/${monitorIds.length} monitors on ${args.agentId}.`
  );

  // Set once the moved monitors are all confirmed running on a survivor, which
  // marks the start of the post-failover steady state (see step 5).
  let failoverSettledAt: string | undefined;

  console.log(`\n=== 3. Killing agent (docker stop ${args.container}) ===`);
  execSync(`docker stop ${args.container}`, { stdio: 'inherit' });
  const killedAt = new Date().toISOString();

  if (onKillTarget.length > 0) {
    console.log('\n=== 4. Waiting for failover to survivors ===');
    await poll(
      async () => {
        for (const id of onKillTarget) {
          const agents = await agentsForMonitorSince(esClient, id, killedAt);
          const movedToSurvivor = agents.some((agentId) => agentId !== args.agentId);
          if (!movedToSurvivor) {
            return undefined;
          }
        }
        return true;
      },
      {
        intervalMs: 15_000,
        // Eviction needs the check-in AND data-plane liveness windows to both
        // lapse, plus at least one 1m task tick after that.
        timeoutMs: STALE_DATA_MS + 3 * 60_000,
        label: 'moved monitors to reappear on a survivor agent',
      }
    ).then(
      () => {
        failoverSettledAt = new Date().toISOString();
        console.log('  ✓ All moved monitors reappeared on a survivor.');
      },
      (e) => {
        if (e instanceof TimeoutError) {
          console.log(`  ✗ ${e.message} — treating as a DROPPED monitor.`);
          violationsFound = true;
          return;
        }
        throw e;
      }
    );
  } else {
    console.log('\n=== 4. No monitors were on the killed agent — skipping failover wait ===');
  }

  console.log('\n=== 5. Checking at-most-once invariant in steady-state windows ===');
  // A *successful* failover legitimately re-runs a monitor under a different
  // `agent.id`, and the ES|QL invariant cannot tell that apart from a genuine
  // duplicate (see `at_most_once_check.ts`) -- so a single window spanning the
  // kill would flag every correctly-moved monitor and report FAILED on a
  // healthy run. Check the steady-state windows either side of the transition
  // instead, where two distinct agents for one monitor really is a duplicate.
  //
  // Querying immediately after stamping failoverSettledAt makes the second
  // window empty (`to` defaults to now). Wait one 1m schedule, then pass `to`.
  // Skip the post-settle window if failover never completed — `from: killedAt`
  // would span the transition and false-positive.
  const STEADY_STATE_OBSERVE_MS = 70_000;
  if (failoverSettledAt) {
    await sleep(STEADY_STATE_OBSERVE_MS);
  }
  const steadyStateWindows: Array<{ label: string; window: AtMostOnceCheckWindow }> = [
    { label: 'before the kill', window: { from: testStart, to: killedAt } },
  ];
  if (failoverSettledAt) {
    steadyStateWindows.push({
      label: 'after failover settled',
      window: { from: failoverSettledAt, to: new Date().toISOString() },
    });
  }
  for (const { label, window } of steadyStateWindows) {
    const violations = await findAtMostOnceViolations(esClient, window);
    if (violations.length > 0) {
      violationsFound = true;
      console.log(`  ✗ ${label}: ${violations.length} monitor(s) ran on more than one agent:`);
      for (const v of violations) {
        console.log(`    - ${v.monitorId}: [${v.agentIds.join(', ')}]`);
      }
    } else {
      console.log(`  ✓ ${label}: no monitor ran on more than one agent.`);
    }
  }

  console.log(`\n=== 6. Restarting agent (docker start ${args.container}) ===`);
  execSync(`docker start ${args.container}`, { stdio: 'inherit' });
  const recoveredAt = Date.now();

  await poll(async () => ((await getAgentStatus(args.agentId)) === 'online' ? true : undefined), {
    intervalMs: 10_000,
    timeoutMs: 2 * 60_000,
    label: 'recovered agent to check in as online',
  }).catch((e) => {
    if (e instanceof TimeoutError) {
      console.log(`  ! ${e.message}`);
      return undefined;
    }
    throw e;
  });
  console.log('  ✓ Agent checked back in.');

  if (onKillTarget.length > 0) {
    console.log(
      '\n=== 7. Hysteresis check: recovered agent must stay idle for the stability window ==='
    );
    const stabilityDeadline = recoveredAt + RECOVERY_STABILITY_MS;
    while (Date.now() < stabilityDeadline - 5_000) {
      for (const id of onKillTarget) {
        const agents = await agentsForMonitorSince(
          esClient,
          id,
          new Date(recoveredAt).toISOString()
        );
        if (agents.includes(args.agentId)) {
          hysteresisViolated = true;
          console.log(
            `  ✗ Monitor ${id} ran on ${args.agentId} before RECOVERY_STABILITY_MS elapsed — hysteresis broken.`
          );
        }
      }
      await sleep(15_000);
    }
    if (!hysteresisViolated) {
      console.log('  ✓ Recovered agent stayed idle through the stability window.');
    }

    console.log('\n=== 8. Post-hysteresis: observing whether load is redistributed back ===');
    await sleep(70_000); // one rebalance tick past the stability window
    for (const id of onKillTarget) {
      const agents = await agentsForMonitorSince(esClient, id, new Date(recoveredAt).toISOString());
      const backOnRecovered = agents.includes(args.agentId);
      console.log(
        `  · Monitor ${id}: ${
          backOnRecovered ? 'moved back to' : 'still off'
        } the recovered agent ` +
          '(informational — cost-balancing may leave it on its current survivor).'
      );
    }
  }

  if (!args.keep) {
    console.log('\n=== 9. Cleaning up test monitors ===');
    await deleteMonitors(monitorIds);
  } else {
    console.log('\n=== 9. --keep set: leaving test monitors in place ===');
  }

  console.log('\n=== Result ===');
  if (violationsFound || hysteresisViolated) {
    console.log('✗ FAILED — see violations above.');
    process.exitCode = 1;
  } else {
    console.log('✓ PASSED — no drops, no duplicates, hysteresis held.');
  }
};
