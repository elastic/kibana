/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import axios from 'axios';
import https from 'https';
import { Client } from '@elastic/elasticsearch';
import { readKibanaConfig } from '@kbn/observability-synthetics-test-data';
import {
  agentIdFromCondition,
  UNASSIGNED_CONDITION,
} from '../../server/synthetics_service/private_location/assign_by_condition';

/**
 * Load/scale harness for elastic/kibana#281846's "Load/scale" checklist item:
 * a reproducible run at a chosen agent/monitor count that records throughput
 * (time to full placement), conflict rate (failed writes during bulk
 * create), balance (final per-agent monitor share vs. each agent's capacity
 * share), and agent-stats latency (`GET .../private_locations/agent_stats`,
 * the route the UI polls). Prints a report; produces no pass/fail verdict --
 * this is evidence-gathering for documenting the scale envelope, not a test.
 *
 * Uses fake `.fleet-agents` documents (see `indexFakeAgent` below, the same
 * technique proven out in the scalable-private-location Scout specs) so
 * the run is reproducible without provisioning real Elastic Agent processes
 * at scale. Real Fleet Server / agent overhead (enrollment, check-in
 * polling, actual Heartbeat execution) is NOT modelled -- this measures
 * Kibana/Fleet/ES's placement and write path in isolation, not full
 * end-to-end system load.
 *
 * Monitors are created one HTTP call at a time (there's no bulk-create API
 * for regular monitors), so the throughput figure measures Kibana's
 * single-monitor-create latency at the given scale, not achievable bulk
 * ingest rate -- a real customer rollout scripted through the UI/API would
 * see the same per-call cost.
 *
 * Usage:
 *   node scripts/load_scale_check.js [--agents 10] [--monitors 500]
 *     [--capacity-mib 4096] [--location-label "Load test location"] [--keep]
 */

interface CliArgs {
  agentCount: number;
  monitorCount: number;
  capacityMib: number[];
  locationLabel: string;
  keep: boolean;
}

const parseArgs = (): CliArgs => {
  const argv = process.argv.slice(2);
  const flag = (name: string) => {
    const idx = argv.indexOf(`--${name}`);
    return idx === -1 ? undefined : argv[idx + 1];
  };
  const agentCount = Number(flag('agents') ?? '10');
  const capacityArg = flag('capacity-mib');
  // A single value applies to every agent; a comma list is cycled across
  // agents so mixed-capacity fleets can be modelled (e.g. "8192,2048").
  const capacityValues = (capacityArg ?? '4096').split(',').map(Number);
  const capacityMib = Array.from(
    { length: agentCount },
    (_, i) => capacityValues[i % capacityValues.length]
  );
  return {
    agentCount,
    monitorCount: Number(flag('monitors') ?? '500'),
    capacityMib,
    locationLabel: flag('location-label') ?? `Load scale test ${Date.now()}`,
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
  const started = Date.now();
  try {
    const response = await axios.request({
      data,
      method,
      url: `${kibanaUrl}${path}`,
      auth,
      headers,
      httpsAgent,
      validateStatus: () => true,
    });
    return { status: response.status, body: response.data, durationMs: Date.now() - started };
  } catch (error: any) {
    return {
      status: 0,
      body: { message: error.message },
      durationMs: Date.now() - started,
    };
  }
};

// --- Elasticsearch connection ---

const buildEsClient = (): Client => {
  if (process.env.ELASTICSEARCH_HOST) {
    return new Client({
      node: process.env.ELASTICSEARCH_HOST,
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME ?? 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD ?? 'changeme',
      },
    });
  }
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

// --- Fake-agent write access: `.fleet-agents` is a restricted ES index; see
// the identical workaround (and why it's needed) in
// `test/scout/common/fixtures/fleet.ts`. ---

const AGENTS_INDEX = '.fleet-agents';
const AGENTS_WRITER_ROLE = 'synthetics_load_scale_fleet_agents_writer';
const AGENTS_WRITER_PASSWORD = 'SyntheticsLoadScaleWriter!1';

const getAgentWriterClient = async (esClient: Client): Promise<Client> => {
  await esClient.security.putRole({
    name: AGENTS_WRITER_ROLE,
    indices: [{ names: [`${AGENTS_INDEX}*`], privileges: ['all'], allow_restricted_indices: true }],
  });
  try {
    await esClient.security.putUser({
      username: AGENTS_WRITER_ROLE,
      password: AGENTS_WRITER_PASSWORD,
      roles: [AGENTS_WRITER_ROLE],
    });
  } catch (error) {
    // The role above is already provisioned; drop it rather than leaving it
    // behind for a caller that never gets a `writerClient` to hand to
    // `removeAgentWriterCredentials`.
    await esClient.security.deleteRole({ name: AGENTS_WRITER_ROLE }).catch(() => {});
    throw error;
  }
  const basicAuth = Buffer.from(`${AGENTS_WRITER_ROLE}:${AGENTS_WRITER_PASSWORD}`).toString(
    'base64'
  );
  return esClient.child({ headers: { authorization: `Basic ${basicAuth}` } });
};

/** Best-effort teardown of the credentials {@link getAgentWriterClient} provisions. */
const removeAgentWriterCredentials = async (esClient: Client): Promise<void> => {
  try {
    await esClient.security.deleteUser({ username: AGENTS_WRITER_ROLE });
    await esClient.security.deleteRole({ name: AGENTS_WRITER_ROLE });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.log(
      `  ! Failed to remove the '${AGENTS_WRITER_ROLE}' role/user -- remove it by hand: ${reason}`
    );
  }
};

const indexFakeAgent = async (
  writerClient: Client,
  agentPolicyId: string,
  memoryMib: number,
  hostname: string
): Promise<string> => {
  const BYTES_PER_MIB = 1024 * 1024;
  const response = await writerClient.index({
    index: AGENTS_INDEX,
    refresh: false,
    document: {
      active: true,
      policy_id: agentPolicyId,
      policy_revision_idx: 1,
      last_checkin_status: 'online',
      last_checkin: new Date().toISOString(),
      enrolled_at: new Date().toISOString(),
      type: 'PERMANENT',
      local_metadata: {
        host: { hostname, memory: memoryMib * BYTES_PER_MIB },
        elastic: { agent: { version: '9.6.0' } },
      },
    },
  });
  return response._id;
};

// --- Small helpers ---

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface PackagePolicy {
  id: string;
  condition?: string | null;
}

const getPackagePolicies = async (agentPolicyId: string): Promise<PackagePolicy[]> => {
  const perPage = 10000;
  const items: PackagePolicy[] = [];
  for (let page = 1; ; page++) {
    const res = await request(
      'get',
      `/api/fleet/package_policies?page=${page}&perPage=${perPage}&kuery=${encodeURIComponent(
        `ingest-package-policies.policy_ids: "${agentPolicyId}"`
      )}`
    );
    const batch = (res.body?.items ?? []) as PackagePolicy[];
    items.push(...batch);
    if (batch.length < perPage) {
      return items;
    }
  }
};

const ensureAgentPolicy = async (name: string): Promise<string> => {
  const res = await request('post', '/api/fleet/agent_policies', {
    name,
    description: 'Synthetics load/scale harness',
    namespace: 'default',
    monitoring_enabled: [],
  });
  if (res.status !== 200) {
    throw new Error(`Failed to create agent policy: ${JSON.stringify(res.body)}`);
  }
  return res.body.item.id;
};

const ensurePrivateLocation = async (label: string, agentPolicyId: string): Promise<string> => {
  const res = await request('post', '/api/synthetics/private_locations', {
    label,
    agentPolicyId,
    geo: { lat: 0, lon: 0 },
    isAgentSharding: true,
  });
  if (res.status !== 200) {
    throw new Error(`Failed to create private location: ${JSON.stringify(res.body)}`);
  }
  return res.body.id;
};

const testMonitor = (name: string, location: { id: string; label: string }) => ({
  name,
  type: 'http',
  form_monitor_type: 'http',
  urls: 'https://www.elastic.co',
  schedule: { number: '5', unit: 'm' },
  locations: [{ id: location.id, label: location.label, isServiceManaged: false }],
  tags: ['synthetics-load-scale-harness'],
  enabled: true,
  namespace: 'default',
});

export const checkLoadScale = async () => {
  const args = parseArgs();
  const esClient = buildEsClient();

  console.log(
    `Config: agents=${args.agentCount} monitors=${args.monitorCount} ` +
      `capacityMib=[${args.capacityMib.join(',')}] location="${args.locationLabel}"`
  );

  console.log('\n=== 1. Provisioning location + agents ===');
  const agentPolicyId = await ensureAgentPolicy(`${args.locationLabel} policy`);
  const locationId = await ensurePrivateLocation(args.locationLabel, agentPolicyId);
  const writerClient = await getAgentWriterClient(esClient);

  // Everything from here on holds the `.fleet-agents` writer credentials
  // provisioned above; always drop them -- even under `--keep` (which only
  // preserves the monitors/agents/location for inspection) or when a step
  // throws mid-run. This is a native-realm user with `all` on a restricted
  // index, password hardcoded in this file, on the developer's own
  // long-lived cluster, not an ephemeral test cluster.
  try {
    const agentIds: string[] = [];
    for (let i = 0; i < args.agentCount; i++) {
      const id = await indexFakeAgent(
        writerClient,
        agentPolicyId,
        args.capacityMib[i],
        `load-scale-agent-${i}`
      );
      agentIds.push(id);
    }
    await writerClient.indices.refresh({ index: AGENTS_INDEX });
    console.log(`  ✓ ${agentIds.length} fake agents enrolled on policy ${agentPolicyId}`);

    console.log('\n=== 2. Bulk-creating monitors (throughput + conflict rate) ===');
    const createStart = Date.now();
    let conflicts = 0;
    const monitorIds: string[] = [];
    for (let i = 0; i < args.monitorCount; i++) {
      const res = await request(
        'post',
        '/api/synthetics/monitors',
        testMonitor(`load-scale-monitor-${i}-${createStart}`, {
          id: locationId,
          label: args.locationLabel,
        })
      );
      if (res.status === 200) {
        monitorIds.push(res.body.id);
      } else if (res.status === 409) {
        conflicts++;
      } else {
        console.log(`  ! Create failed (status ${res.status}): ${JSON.stringify(res.body)}`);
      }
    }
    const createDurationMs = Date.now() - createStart;
    console.log(
      `  ✓ Created ${monitorIds.length}/${args.monitorCount} monitors in ${(
        createDurationMs / 1000
      ).toFixed(1)}s ` +
        `(${(monitorIds.length / (createDurationMs / 1000)).toFixed(
          1
        )}/s), ${conflicts} conflict(s)`
    );

    console.log('\n=== 3. Waiting for full placement (throughput to steady state) ===');
    const placementStart = Date.now();
    const deadline = placementStart + 5 * 60_000;
    let placedCount = 0;
    let policies: PackagePolicy[] = [];
    while (Date.now() < deadline) {
      policies = await getPackagePolicies(agentPolicyId);
      const byPolicyId = new Map(policies.map((p) => [p.id, p]));
      placedCount = monitorIds.filter((id) => {
        const policy = byPolicyId.get(`${id}-${locationId}`);
        return policy?.condition && policy.condition !== UNASSIGNED_CONDITION;
      }).length;
      if (placedCount === monitorIds.length) {
        break;
      }
      await sleep(5_000);
    }
    const placementDurationMs = Date.now() - placementStart;
    console.log(
      `  ${placedCount === monitorIds.length ? '✓' : '✗'} ${placedCount}/${
        monitorIds.length
      } monitors placed after ${(placementDurationMs / 1000).toFixed(1)}s`
    );

    console.log('\n=== 4. Balance across agents ===');
    const countByAgent = new Map<string, number>(agentIds.map((id) => [id, 0]));
    for (const policy of policies) {
      const agentId = agentIdFromCondition(policy.condition);
      if (agentId && countByAgent.has(agentId)) {
        countByAgent.set(agentId, countByAgent.get(agentId)! + 1);
      }
    }
    const totalCapacity = args.capacityMib.reduce((sum, mib) => sum + mib, 0);
    agentIds.forEach((id, i) => {
      const count = countByAgent.get(id) ?? 0;
      const expectedShare = args.capacityMib[i] / totalCapacity;
      const actualShare = monitorIds.length > 0 ? count / monitorIds.length : 0;
      console.log(
        `  agent ${i} (${args.capacityMib[i]}MiB): ${count} monitors ` +
          `(expected share ${(expectedShare * 100).toFixed(0)}%, actual ${(
            actualShare * 100
          ).toFixed(0)}%)`
      );
    });

    console.log('\n=== 5. Agent-stats latency ===');
    const statsLatencies: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await request('get', '/internal/synthetics/private_locations/agent_stats');
      statsLatencies.push(res.durationMs);
    }
    const avgLatency = statsLatencies.reduce((sum, ms) => sum + ms, 0) / statsLatencies.length;
    console.log(
      `  avg ${avgLatency.toFixed(0)}ms over ${statsLatencies.length} calls ` +
        `(min ${Math.min(...statsLatencies)}ms, max ${Math.max(...statsLatencies)}ms)`
    );

    if (!args.keep) {
      console.log('\n=== 6. Cleaning up ===');
      for (const id of monitorIds) {
        await request('delete', `/api/synthetics/monitors/${id}`);
      }
      await writerClient.deleteByQuery({
        index: AGENTS_INDEX,
        query: { terms: { _id: agentIds } },
        refresh: true,
        ignore_unavailable: true,
      });
      await request('delete', `/api/synthetics/private_locations/${locationId}`);
    } else {
      console.log('\n=== 6. --keep set: leaving monitors, agents, and location in place ===');
    }

    console.log('\n=== Summary ===');
    console.log(
      JSON.stringify(
        {
          agents: args.agentCount,
          monitorsRequested: args.monitorCount,
          monitorsCreated: monitorIds.length,
          createConflicts: conflicts,
          createThroughputPerSec: Number(
            (monitorIds.length / (createDurationMs / 1000)).toFixed(2)
          ),
          placementDurationSec: Number((placementDurationMs / 1000).toFixed(1)),
          allPlaced: placedCount === monitorIds.length,
          agentStatsLatencyMsAvg: Number(avgLatency.toFixed(0)),
        },
        null,
        2
      )
    );
  } finally {
    await removeAgentWriterCredentials(esClient);
  }
};
