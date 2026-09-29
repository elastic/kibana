/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  dateSuffixesBetween,
  episodeIndexNames,
  ensureIndex,
  bulkIndex,
  scriptsDataDir,
} from './indexing';

/**
 * Correlates the aws-iam pack's escalated-role AssumeRole chain (`events.ndjson`,
 * `host.name: 'WIN-ANALYST01'`) to a Fleet-enrolled endpoint so Hunt Watch's six
 * MVP respond actions (isolate/kill-process/suspend-process/unisolate/
 * running-processes/memory-dump) have a real target. Prototype scope: aws-iam only.
 *
 * Hunt Watch's SSE entity extraction already surfaces `host.name` generically from
 * any Tier 1/Tier 2 hit (Tier 1's `terms` aggregation on `host.name`, Tier 2's
 * `KEEP host.name` in generated ES|QL) — no Worker code changes are needed. What's
 * missing is (1) a Fleet agent record `resolveHostEnrollment` can find via
 * `local_metadata.host.hostname`, and (2) endpoint process telemetry so the
 * process-scoped actions (kill-process/suspend-process/memory-dump) have a
 * `process.entity_id`/`pid` to select, not just a bare host for isolate/unisolate.
 *
 * The process tree is deliberately plain (readable command lines, no encoded
 * commands, no living-off-the-land technique) so it does not also trip a prebuilt
 * detection rule and mint a competing, redundant respond-action-capable alert for
 * the same host — see the "what about the alerts" discussion this fixture follows.
 */

export const AWS_IAM_HOST_CORRELATION_HOST = 'WIN-ANALYST01';
/** Must equal the `.fleet-agents` document's own `_id` (not `_source.agent.id`), because
 * that is what `resolveHostEnrollment` returns as `agentId` (Fleet's `searchHitToAgent()`
 * maps the ES hit's `_id`, not the stored `agent.id` field, to `Agent.id`). Kept identical
 * to `_source.agent.id` below anyway so the record reads consistently if inspected directly.
 */
export const AWS_IAM_HOST_CORRELATION_AGENT_ID = 'a1b2c3d4-5e6f-4a1b-9c2d-3e4f5a6b7c8d';
const AGENTS_INDEX = '.fleet-agents';
const EPISODE_ID = 'aws-iam-win-analyst01';
const PROCESS_MAPPING_PATH = scriptsDataDir('episodes', 'attacks', 'mapping.json');

/**
 * `.fleet-agents` is an ES "restricted index" — even the `elastic` superuser is denied
 * `indices:data/write/bulk` on it directly. The standard workaround (same one Kibana's own
 * Scout/FTR fixtures use, e.g. `createSystemIndicesEsClient`) is a dedicated role/user with
 * `allow_restricted_indices: true` scoped to the index, used only for the `.fleet-agents`
 * calls below via a per-request auth override (no separate Client/connection needed).
 */
const SYSTEM_INDICES_ROLE = 'data-generator-system-indices';
const SYSTEM_INDICES_USER = 'data-generator-system-indices';
const SYSTEM_INDICES_PASSWORD = 'data-generator-system-indices-changeme';

const ensureSystemIndicesUser = async (esClient: Client): Promise<void> => {
  await esClient.security.putRole({
    name: SYSTEM_INDICES_ROLE,
    indices: [{ names: [AGENTS_INDEX], privileges: ['all'], allow_restricted_indices: true }],
  });
  await esClient.security.putUser({
    username: SYSTEM_INDICES_USER,
    password: SYSTEM_INDICES_PASSWORD,
    roles: [SYSTEM_INDICES_ROLE],
  });
};

/**
 * `TransportRequestOptions` has no `auth` override in this client version, so the
 * per-request identity swap goes through a manual Basic-auth header instead.
 */
const systemIndicesAuth = {
  headers: {
    authorization: `Basic ${Buffer.from(
      `${SYSTEM_INDICES_USER}:${SYSTEM_INDICES_PASSWORD}`
    ).toString('base64')}`,
  },
};

interface ProcessNode {
  pid: number;
  entityId: string;
  name: string;
  executable: string;
  commandLine: string;
  parent?: { pid: number; entityId: string };
  offsetMs: number;
}

/**
 * cmd.exe -> powershell.exe -> aws.exe, timed to land shortly before the escalated-role
 * AssumeRole CloudTrail event the pack's own telemetry already names on this host.
 * Plain, readable command lines only (no encoding/obfuscation) so this stays a
 * behavior a hunt can ground on without also matching a prebuilt detection signature.
 */
const PROCESS_TREE: ProcessNode[] = [
  {
    pid: 4100,
    entityId: 'YXdzLWlhbS13aW4tYW5hbHlzdDAxLTQxMDA=',
    name: 'cmd.exe',
    executable: 'C:\\Windows\\System32\\cmd.exe',
    commandLine: 'C:\\Windows\\System32\\cmd.exe',
    offsetMs: 0,
  },
  {
    pid: 4212,
    entityId: 'YXdzLWlhbS13aW4tYW5hbHlzdDAxLTQyMTI=',
    name: 'powershell.exe',
    executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    commandLine:
      'powershell.exe -NoProfile -Command "aws sts assume-role --role-arn arn:aws:iam::123456789012:role/escalated-role --role-session-name priv-esc-session"',
    parent: { pid: 4100, entityId: 'YXdzLWlhbS13aW4tYW5hbHlzdDAxLTQxMDA=' },
    offsetMs: 15_000,
  },
  {
    pid: 4288,
    entityId: 'YXdzLWlhbS13aW4tYW5hbHlzdDAxLTQyODg=',
    name: 'aws.exe',
    executable: 'C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe',
    commandLine:
      'aws.exe sts assume-role --role-arn arn:aws:iam::123456789012:role/escalated-role --role-session-name priv-esc-session',
    parent: { pid: 4212, entityId: 'YXdzLWlhbS13aW4tYW5hbHlzdDAxLTQyMTI=' },
    offsetMs: 22_000,
  },
];

const buildFleetAgentDoc = (): Record<string, unknown> => {
  const now = new Date().toISOString();
  return {
    access_api_key_id: 'aws-iam-win-analyst01-api-key',
    active: true,
    enrolled_at: now,
    agent: { id: AWS_IAM_HOST_CORRELATION_AGENT_ID, version: '8.15.0' },
    local_metadata: {
      elastic: {
        agent: {
          id: AWS_IAM_HOST_CORRELATION_AGENT_ID,
          log_level: 'info',
          snapshot: false,
          upgradeable: true,
          version: '8.15.0',
        },
      },
      host: {
        architecture: 'x86_64',
        hostname: AWS_IAM_HOST_CORRELATION_HOST,
        name: AWS_IAM_HOST_CORRELATION_HOST,
        id: 'b2c3d4e5-6f7a-4b1c-8d2e-3f4a5b6c7d8e',
        ip: ['203.0.113.15'],
        mac: ['02:42:ac:11:00:15'],
      },
      os: {
        family: 'windows',
        full: 'Windows Server 2019 Datacenter',
        kernel: '10.0.17763.1879 (Build.160101.0800)',
        name: 'Windows Server 2019 Datacenter',
        platform: 'windows',
        version: '10.0',
      },
    },
    user_provided_metadata: {},
    policy_id: 'c3d4e5f6-7a8b-4c1d-9e2f-4a5b6c7d8e9f',
    type: 'PERMANENT',
    updated_at: now,
    last_checkin: now,
    last_checkin_status: 'online',
    policy_revision_idx: 1,
  };
};

const buildProcessDoc = (node: ProcessNode, anchorMs: number): Record<string, unknown> => ({
  '@timestamp': new Date(anchorMs + node.offsetMs).toISOString(),
  ecs: { version: '8.11.0' },
  data_stream: { type: 'logs', dataset: 'endpoint.events.process', namespace: 'default' },
  event: {
    action: 'start',
    category: ['process'],
    type: ['start'],
    kind: 'event',
    dataset: 'endpoint.events.process',
    module: 'endpoint',
  },
  agent: { id: AWS_IAM_HOST_CORRELATION_AGENT_ID, type: 'endpoint', version: '8.15.0' },
  host: {
    name: AWS_IAM_HOST_CORRELATION_HOST,
    hostname: AWS_IAM_HOST_CORRELATION_HOST,
    id: 'b2c3d4e5-6f7a-4b1c-8d2e-3f4a5b6c7d8e',
    os: { family: 'windows', name: 'Windows Server 2019 Datacenter', platform: 'windows' },
  },
  user: { name: 'dev-user', domain: 'CORP' },
  process: {
    pid: node.pid,
    entity_id: node.entityId,
    name: node.name,
    executable: node.executable,
    command_line: node.commandLine,
    ...(node.parent ? { parent: { pid: node.parent.pid, entity_id: node.parent.entityId } } : {}),
  },
});

/**
 * Anchor timestamp for the process burst: 3 days before `endMs`, well inside the
 * historic hunt window and close enough to "now" to read as recent in a live demo.
 */
const resolveAnchorMs = (endMs: number): number => endMs - 3 * 24 * 60 * 60 * 1000;

export const seedAwsIamHostCorrelation = async ({
  esClient,
  log,
  endMs,
}: {
  esClient: Client;
  log: ToolingLog;
  endMs: number;
}): Promise<void> => {
  await ensureSystemIndicesUser(esClient);
  await esClient.index(
    {
      index: AGENTS_INDEX,
      id: AWS_IAM_HOST_CORRELATION_AGENT_ID,
      document: buildFleetAgentDoc(),
      refresh: true,
    },
    systemIndicesAuth
  );
  log.info(
    `aws-iam host correlation: seeded Fleet agent ${AWS_IAM_HOST_CORRELATION_AGENT_ID} for host ${AWS_IAM_HOST_CORRELATION_HOST}`
  );

  const index = episodeIndexNames({ episodeId: EPISODE_ID, endMs }).endpointEvents;
  await ensureIndex({ esClient, index, mappingPath: PROCESS_MAPPING_PATH, log });

  const anchorMs = resolveAnchorMs(endMs);
  const docs = PROCESS_TREE.map((node) => buildProcessDoc(node, anchorMs));
  await bulkIndex({ esClient, index, docs, log });
  await esClient.indices.refresh({ index });
  log.info(
    `aws-iam host correlation: indexed ${docs.length} process event(s) for ${AWS_IAM_HOST_CORRELATION_HOST} → ${index}`
  );
};

export const cleanAwsIamHostCorrelation = async ({
  esClient,
  log,
  startMs,
  endMs,
}: {
  esClient: Client;
  log: ToolingLog;
  startMs: number;
  endMs: number;
}): Promise<void> => {
  try {
    await ensureSystemIndicesUser(esClient);
    await esClient.delete(
      { index: AGENTS_INDEX, id: AWS_IAM_HOST_CORRELATION_AGENT_ID },
      { ...systemIndicesAuth, ignore: [404] }
    );
    log.info(`--clean: deleted aws-iam host correlation Fleet agent (if present).`);
  } catch (e) {
    log.warning(`--clean: failed to delete aws-iam host correlation Fleet agent: ${String(e)}`);
  }

  const suffixes = dateSuffixesBetween(startMs, endMs);
  const indices = suffixes.map(
    (suffix) =>
      episodeIndexNames({ episodeId: EPISODE_ID, endMs, dateSuffixOverride: suffix }).endpointEvents
  );
  try {
    await esClient.indices.delete({ index: indices, ignore_unavailable: true });
    log.info(`--clean: deleted aws-iam host correlation process index/indices.`);
  } catch (e) {
    log.warning(`--clean: failed to delete aws-iam host correlation indices: ${String(e)}`);
  }
};
