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
  deleteIndicesChunked,
  episodeIndexNames,
  ensureIndex,
  bulkIndex,
  scriptsDataDir,
} from './indexing';

/**
 * Correlates a Technology Watch pack's cloud/SaaS telemetry to a Fleet-enrolled endpoint so
 * Hunt Watch's six MVP respond actions (isolate/kill-process/suspend-process/unisolate/
 * running-processes/memory-dump) have a real target. One config entry per pack; aws-iam is
 * the first (`WIN-ANALYST01`, plan 2's DC2 entity join host).
 *
 * Hunt Watch's SSE entity extraction already surfaces `host.name` generically from any Tier
 * 1/Tier 2 hit (Tier 1's `terms` aggregation on `host.name`, Tier 2's `KEEP host.name` in
 * generated ES|QL) — no Worker code changes are needed. What's missing per pack is (1) a
 * Fleet agent record `resolveHostEnrollment` can find via `local_metadata.host.hostname`, and
 * (2) optionally endpoint process telemetry so process-scoped actions (kill-process/
 * suspend-process/memory-dump) have a `process.entity_id`/`pid` to select, not just a bare
 * host for isolate/unisolate.
 *
 * Seeded process trees are deliberately plain (readable command lines, no encoded commands,
 * no living-off-the-land technique) so they do not also trip a prebuilt detection rule and
 * mint a competing, redundant respond-action-capable alert for the same host.
 */

const AGENTS_INDEX = '.fleet-agents';
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

export interface PackHostCorrelationProcessNode {
  pid: number;
  entityId: string;
  name: string;
  executable: string;
  commandLine: string;
  parent?: { pid: number; entityId: string; name: string };
  offsetMs: number;
}

export interface PackHostCorrelationHostInfo {
  architecture: string;
  hostId: string;
  ip: string[];
  mac: string[];
  osFamily: string;
  osFull: string;
  osKernel: string;
  osName: string;
  osPlatform: string;
  osVersion: string;
}

export interface PackHostCorrelationConfig {
  packId: string;
  /** Fleet-resolvable hostname (`local_metadata.host.hostname`); must match the pack's own
   * telemetry `host.name` for the join to work. */
  hostName: string;
  /** Must equal the `.fleet-agents` document's own `_id` (not `_source.agent.id`), because
   * that is what `resolveHostEnrollment` returns as `agentId` (Fleet's `searchHitToAgent()`
   * maps the ES hit's `_id`, not the stored `agent.id` field, to `Agent.id`). Kept identical
   * to `_source.agent.id` anyway so the record reads consistently if inspected directly. */
  agentId: string;
  episodeId: string;
  policyId: string;
  agentVersion: string;
  accessApiKeyId: string;
  host: PackHostCorrelationHostInfo;
  userName: string;
  userDomain: string;
  /** Only needed if the pack's story should support process-scoped respond actions
   * (kill-process/suspend-process/memory-dump), not just isolate/unisolate. */
  processTree?: PackHostCorrelationProcessNode[];
}

export const PACK_HOST_CORRELATION_CONFIGS: Record<string, PackHostCorrelationConfig> = {
  'aws-iam': {
    packId: 'aws-iam',
    hostName: 'WIN-ANALYST01',
    agentId: 'a1b2c3d4-5e6f-4a1b-9c2d-3e4f5a6b7c8d',
    episodeId: 'aws-iam-win-analyst01',
    policyId: 'c3d4e5f6-7a8b-4c1d-9e2f-4a5b6c7d8e9f',
    agentVersion: '8.15.0',
    accessApiKeyId: 'aws-iam-win-analyst01-api-key',
    host: {
      architecture: 'x86_64',
      hostId: 'b2c3d4e5-6f7a-4b1c-8d2e-3f4a5b6c7d8e',
      ip: ['203.0.113.15'],
      mac: ['02:42:ac:11:00:15'],
      osFamily: 'windows',
      osFull: 'Windows Server 2019 Datacenter',
      osKernel: '10.0.17763.1879 (Build.160101.0800)',
      osName: 'Windows Server 2019 Datacenter',
      osPlatform: 'windows',
      osVersion: '10.0',
    },
    userName: 'dev-user',
    userDomain: 'CORP',
    // cmd.exe -> powershell.exe -> aws.exe, timed to land shortly before the escalated-role
    // AssumeRole CloudTrail event the pack's own telemetry already names on this host.
    processTree: [
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
        parent: { pid: 4100, entityId: 'YXdzLWlhbS13aW4tYW5hbHlzdDAxLTQxMDA=', name: 'cmd.exe' },
        offsetMs: 15_000,
      },
      {
        pid: 4288,
        entityId: 'YXdzLWlhbS13aW4tYW5hbHlzdDAxLTQyODg=',
        name: 'aws.exe',
        executable: 'C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe',
        commandLine:
          'aws.exe sts assume-role --role-arn arn:aws:iam::123456789012:role/escalated-role --role-session-name priv-esc-session',
        parent: {
          pid: 4212,
          entityId: 'YXdzLWlhbS13aW4tYW5hbHlzdDAxLTQyMTI=',
          name: 'powershell.exe',
        },
        offsetMs: 22_000,
      },
    ],
  },
  okta: {
    packId: 'okta',
    hostName: 'ADMIN-WS02',
    agentId: 'd4e5f6a7-8b9c-4d1e-af3a-5b6c7d8e9f0a',
    episodeId: 'okta-admin-ws02',
    policyId: 'f6a7b8c9-0d1e-4f2a-cf5a-7d8e9f0a1b2c',
    agentVersion: '8.15.0',
    accessApiKeyId: 'okta-admin-ws02-api-key',
    host: {
      architecture: 'x86_64',
      hostId: 'e5f6a7b8-9c0d-4e1f-bf4a-6c7d8e9f0a1b',
      ip: ['10.0.1.202'],
      mac: ['00:50:56:A1:AW:02'],
      osFamily: 'windows',
      osFull: 'Windows 11 Enterprise',
      osKernel: '10.0.22631.3007 (Build.231206-1000)',
      osName: 'Windows 11 Enterprise',
      osPlatform: 'windows',
      osVersion: '10.0',
    },
    userName: 'it-admin',
    userDomain: 'CORP',
    // explorer.exe -> powershell.exe -> curl.exe, replaying the stolen Okta admin session
    // against the Okta admin API from ADMIN-WS02, shortly before the Super Admin grant.
    processTree: [
      {
        pid: 5120,
        entityId: 'b2t0YS1hZG1pbi13czAyLTUxMjA=',
        name: 'explorer.exe',
        executable: 'C:\\Windows\\explorer.exe',
        commandLine: 'C:\\Windows\\explorer.exe',
        offsetMs: 0,
      },
      {
        pid: 5244,
        entityId: 'b2t0YS1hZG1pbi13czAyLTUyNDQ=',
        name: 'powershell.exe',
        executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        commandLine:
          'powershell.exe -NoProfile -Command "curl.exe -s https://corp.okta.com/api/v1/users/me"',
        parent: {
          pid: 5120,
          entityId: 'b2t0YS1hZG1pbi13czAyLTUxMjA=',
          name: 'explorer.exe',
        },
        offsetMs: 12_000,
      },
      {
        pid: 5310,
        entityId: 'b2t0YS1hZG1pbi13czAyLTUzMTA=',
        name: 'curl.exe',
        executable: 'C:\\Windows\\System32\\curl.exe',
        commandLine: 'curl.exe -s https://corp.okta.com/api/v1/users/me',
        parent: {
          pid: 5244,
          entityId: 'b2t0YS1hZG1pbi13czAyLTUyNDQ=',
          name: 'powershell.exe',
        },
        offsetMs: 19_000,
      },
    ],
  },
  kubernetes: {
    packId: 'kubernetes',
    hostName: 'ci-runner-03',
    agentId: 'a7b8c9d0-1e2f-4a3b-df6a-8e9f0a1b2c3d',
    episodeId: 'kubernetes-ci-runner-03',
    policyId: 'c9d0e1f2-3a4b-4c5d-fa8a-0a1b2c3d4e5f',
    agentVersion: '8.15.0',
    accessApiKeyId: 'kubernetes-ci-runner-03-api-key',
    host: {
      architecture: 'x86_64',
      hostId: 'b8c9d0e1-2f3a-4b4c-ef7a-9f0a1b2c3d4e',
      ip: ['10.0.8.3'],
      mac: ['00:50:56:A1:C3:03'],
      osFamily: 'linux',
      osFull: 'Ubuntu 22.04.3 LTS',
      osKernel: '5.15.0-89-generic',
      osName: 'Ubuntu',
      osPlatform: 'linux',
      osVersion: '22.04',
    },
    userName: 'compromised-sa',
    userDomain: 'default',
  },
  'github-actions': {
    packId: 'github-actions',
    hostName: 'DEV-BUILD03',
    agentId: 'd0e1f2a3-4b5c-4d6e-ab9a-1b2c3d4e5f6a',
    episodeId: 'github-actions-dev-build03',
    policyId: 'f2a3b4c5-6d7e-4f8a-cd1a-3d4e5f6a7b8c',
    agentVersion: '8.15.0',
    accessApiKeyId: 'github-actions-dev-build03-api-key',
    host: {
      architecture: 'x86_64',
      hostId: 'e1f2a3b4-5c6d-4e7f-bc0a-2c3d4e5f6a7b',
      ip: ['10.0.4.30'],
      mac: ['00:50:56:A1:DB:03'],
      osFamily: 'windows',
      osFull: 'Windows 11 Enterprise',
      osKernel: '10.0.22631.3007 (Build.231206-1000)',
      osName: 'Windows 11 Enterprise',
      osPlatform: 'windows',
      osVersion: '10.0',
    },
    userName: 'dev-contractor-42',
    userDomain: 'CORP',
  },
};

export const buildFleetAgentDoc = (config: PackHostCorrelationConfig): Record<string, unknown> => {
  const now = new Date().toISOString();
  return {
    access_api_key_id: config.accessApiKeyId,
    active: true,
    enrolled_at: now,
    agent: { id: config.agentId, version: config.agentVersion },
    local_metadata: {
      elastic: {
        agent: {
          id: config.agentId,
          log_level: 'info',
          snapshot: false,
          upgradeable: true,
          version: config.agentVersion,
        },
      },
      host: {
        architecture: config.host.architecture,
        hostname: config.hostName,
        name: config.hostName,
        id: config.host.hostId,
        ip: config.host.ip,
        mac: config.host.mac,
      },
      os: {
        family: config.host.osFamily,
        full: config.host.osFull,
        kernel: config.host.osKernel,
        name: config.host.osName,
        platform: config.host.osPlatform,
        version: config.host.osVersion,
      },
    },
    user_provided_metadata: {},
    policy_id: config.policyId,
    type: 'PERMANENT',
    updated_at: now,
    last_checkin: now,
    last_checkin_status: 'online',
    policy_revision_idx: 1,
  };
};

export const buildProcessDoc = (
  config: PackHostCorrelationConfig,
  node: PackHostCorrelationProcessNode,
  anchorMs: number
): Record<string, unknown> => ({
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
  agent: { id: config.agentId, type: 'endpoint', version: config.agentVersion },
  host: {
    name: config.hostName,
    hostname: config.hostName,
    id: config.host.hostId,
    os: {
      family: config.host.osFamily,
      name: config.host.osName,
      platform: config.host.osPlatform,
    },
  },
  user: { name: config.userName, domain: config.userDomain },
  process: {
    pid: node.pid,
    entity_id: node.entityId,
    name: node.name,
    executable: node.executable,
    command_line: node.commandLine,
    ...(node.parent
      ? {
          parent: {
            pid: node.parent.pid,
            entity_id: node.parent.entityId,
            name: node.parent.name,
          },
        }
      : {}),
  },
});

/**
 * Anchor timestamp for the process burst: 3 days before `endMs`, well inside the
 * historic hunt window and close enough to "now" to read as recent in a live demo.
 */
const resolveAnchorMs = (endMs: number): number => endMs - 3 * 24 * 60 * 60 * 1000;

export const seedPackHostCorrelation = async ({
  esClient,
  log,
  endMs,
  config,
}: {
  esClient: Client;
  log: ToolingLog;
  endMs: number;
  config: PackHostCorrelationConfig;
}): Promise<void> => {
  await ensureSystemIndicesUser(esClient);
  await esClient.index(
    {
      index: AGENTS_INDEX,
      id: config.agentId,
      document: buildFleetAgentDoc(config),
      refresh: true,
    },
    systemIndicesAuth
  );
  log.info(
    `${config.packId} host correlation: seeded Fleet agent ${config.agentId} for host ${config.hostName}`
  );

  if (!config.processTree || config.processTree.length === 0) {
    return;
  }

  const index = episodeIndexNames({ episodeId: config.episodeId, endMs }).endpointEvents;
  await ensureIndex({ esClient, index, mappingPath: PROCESS_MAPPING_PATH, log });

  const anchorMs = resolveAnchorMs(endMs);
  const docs = config.processTree.map((node) => buildProcessDoc(config, node, anchorMs));
  await bulkIndex({ esClient, index, docs, log });
  await esClient.indices.refresh({ index });
  log.info(
    `${config.packId} host correlation: indexed ${docs.length} process event(s) for ${config.hostName} → ${index}`
  );
};

export const cleanPackHostCorrelation = async ({
  esClient,
  log,
  startMs,
  endMs,
  config,
}: {
  esClient: Client;
  log: ToolingLog;
  startMs: number;
  endMs: number;
  config: PackHostCorrelationConfig;
}): Promise<void> => {
  try {
    await ensureSystemIndicesUser(esClient);
    await esClient.delete(
      { index: AGENTS_INDEX, id: config.agentId },
      { ...systemIndicesAuth, ignore: [404] }
    );
    log.info(`--clean: deleted ${config.packId} host correlation Fleet agent (if present).`);
  } catch (e) {
    log.warning(
      `--clean: failed to delete ${config.packId} host correlation Fleet agent: ${String(e)}`
    );
  }

  if (!config.processTree || config.processTree.length === 0) {
    return;
  }

  const suffixes = dateSuffixesBetween(startMs, endMs);
  const indices = suffixes.map(
    (suffix) =>
      episodeIndexNames({ episodeId: config.episodeId, endMs, dateSuffixOverride: suffix })
        .endpointEvents
  );
  try {
    await deleteIndicesChunked({ esClient, indices });
    log.info(`--clean: deleted ${config.packId} host correlation process index/indices.`);
  } catch (e) {
    log.warning(
      `--clean: failed to delete ${config.packId} host correlation indices: ${String(e)}`
    );
  }
};
