/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type execa from 'execa';
import { readRolesDescriptorsFromResource, SERVERLESS_ROLES_ROOT_PATH } from '@kbn/es';
import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import type {
  ElasticsearchRoleDescriptor,
  EsClient,
  KbnClient,
  RoleApiCredentials,
  ScoutTestConfig,
} from '@kbn/scout-security';
import { ELASTIC_SECURITY_RULE_ID } from '../../../../common';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '../../../../common/constants';
import {
  FILE_EVENTS_INDEX_PATTERN,
  POLICY_RESPONSE_INDEX,
} from '../../../../common/endpoint/constants';
import type { HostPolicyResponse } from '../../../../common/endpoint/types';
import { HostPolicyResponseActionStatus } from '../../../../common/endpoint/types';
import {
  ENDPOINT_ALERTS_INDEX,
  ENDPOINT_EVENTS_INDEX,
} from '../../../../scripts/endpoint/common/constants';
import type { HostVmExecResponse } from '../../../../scripts/endpoint/common/types';
import { getHostVmClient } from '../../../../scripts/endpoint/common/vm_services';

const DETECTION_ALERTS_INDEX = `${DEFAULT_ALERTS_INDEX}-default`;
const HOST_COMMAND_TIMEOUT_MS = 60_000;

interface ProcessEventSource {
  process?: { command_line?: string; args?: string[] };
  event?: { action?: string };
}

interface FileEventSource {
  file?: { path?: string };
  process?: { name?: string };
  event?: { action?: string };
}

interface DetectionTrigger {
  /** Argument of the trigger process, matched against `process.args`. */
  processArg: string;
  /** Name of the file the trigger writes, matched against `file.name`. */
  fileName: string;
}

interface SecurityRoleApiKeyProvider {
  getApiKey: (roleName: string) => Promise<RoleApiCredentials>;
  getApiKeyForCustomRole: (role: ElasticsearchRoleDescriptor) => Promise<RoleApiCredentials>;
}

/**
 * Runs `command` on the enrolled VM and returns its result even when it exits
 * non-zero: Elastic Defend blocking the command is an expected failure.
 */
export const runCommandOnHost = async (
  hostname: string,
  command: string
): Promise<HostVmExecResponse> =>
  getHostVmClient(hostname)
    .exec(command, { silent: true, timeoutMs: HOST_COMMAND_TIMEOUT_MS })
    .catch((error: execa.ExecaError) => ({
      stdout: error.stdout ?? '',
      stderr: error.stderr || error.message,
      exitCode: error.exitCode ?? 1,
    }));

export const countEndpointAlertsForAgent = async (
  esClient: EsClient,
  agentId: string
): Promise<number> => {
  const { count } = await esClient.count({
    index: ENDPOINT_ALERTS_INDEX,
    ignore_unavailable: true,
    query: { term: { 'agent.id': agentId } },
  });
  return count;
};

const getTotalHits = (total: number | { value: number } | undefined): number | undefined =>
  typeof total === 'number' ? total : total?.value;

/**
 * Summarizes why an Endpoint alert may be missing: whether the Endpoint recorded the
 * trigger process and the file it wrote, and which protections and global artifacts
 * its policy response reports.
 */
export const describeEndpointDetectionState = async (
  esClient: EsClient,
  agentId: string,
  { processArg, fileName }: DetectionTrigger
): Promise<string> => {
  const agentFilter = { term: { 'agent.id': agentId } };
  const [triggerEvents, triggerFileEvents, processEventCount, policyResponses] = await Promise.all([
    esClient.search<ProcessEventSource>({
      index: ENDPOINT_EVENTS_INDEX,
      ignore_unavailable: true,
      size: 3,
      track_total_hits: true,
      sort: [{ '@timestamp': 'desc' }],
      _source: ['process.command_line', 'process.args', 'event.action'],
      query: { bool: { filter: [agentFilter, { term: { 'process.args': processArg } }] } },
    }),
    esClient.search<FileEventSource>({
      index: FILE_EVENTS_INDEX_PATTERN,
      ignore_unavailable: true,
      size: 3,
      track_total_hits: true,
      sort: [{ '@timestamp': 'desc' }],
      _source: ['file.path', 'process.name', 'event.action'],
      query: { bool: { filter: [agentFilter, { term: { 'file.name': fileName } }] } },
    }),
    esClient.count({ index: ENDPOINT_EVENTS_INDEX, ignore_unavailable: true, query: agentFilter }),
    esClient.search<HostPolicyResponse>({
      index: POLICY_RESPONSE_INDEX,
      ignore_unavailable: true,
      size: 1,
      sort: [{ '@timestamp': 'desc' }],
      query: agentFilter,
    }),
  ]);

  const applied = policyResponses.hits.hits[0]?._source?.Endpoint.policy.applied;

  return JSON.stringify({
    triggerProcessEvents: {
      total: getTotalHits(triggerEvents.hits.total),
      samples: triggerEvents.hits.hits.map(({ _source }) => _source),
    },
    triggerFileEvents: {
      total: getTotalHits(triggerFileEvents.hits.total),
      samples: triggerFileEvents.hits.hits.map(({ _source }) => _source),
    },
    processEventsForAgent: processEventCount.count,
    policyResponse: applied
      ? {
          status: applied.status,
          behaviorProtection: applied.response.configurations.behavior_protection?.status,
          failedActions: applied.actions
            .filter(({ status }) => status !== HostPolicyResponseActionStatus.success)
            .map(({ name, status, message }) => `${name} (${status}): ${message}`),
          globalArtifacts: applied.artifacts.global.identifiers?.map(({ name }) => name) ?? [],
        }
      : 'none',
  });
};

/**
 * Disables and re-enables the Endpoint Security rule so it runs now instead of
 * on its 5 minute interval. The rule is installed by the Fleet callback when
 * the Endpoint package policy is created.
 */
export const restartEndpointSecurityRule = async (kbnClient: KbnClient): Promise<void> => {
  const {
    data: { id },
  } = await kbnClient.request<{ id: string }>({
    method: 'GET',
    path: DETECTION_ENGINE_RULES_URL,
    query: { rule_id: ELASTIC_SECURITY_RULE_ID },
    headers: PUBLIC_API_HEADERS,
  });

  for (const action of ['disable', 'enable'] as const) {
    await kbnClient.request({
      method: 'POST',
      path: DETECTION_ENGINE_RULES_BULK_ACTION,
      headers: PUBLIC_API_HEADERS,
      body: { action, ids: [id] },
    });
  }
};

/** Detection Engine alerts created by the Endpoint Security rule for `agentId`. */
export const getEndpointSecurityAlertsQuery = (agentId: string) => ({
  bool: {
    filter: [
      { term: { 'agent.id': agentId } },
      { term: { 'agent.type': 'endpoint' } },
      { term: { 'kibana.alert.rule.rule_id': ELASTIC_SECURITY_RULE_ID } },
    ],
  },
});

export const deleteDetectionAlertsForAgent = async (
  esClient: EsClient,
  agentId: string
): Promise<void> => {
  await esClient.deleteByQuery({
    index: DETECTION_ALERTS_INDEX,
    ignore_unavailable: true,
    query: { term: { 'agent.id': agentId } },
    conflicts: 'proceed',
    refresh: true,
  });
};

/**
 * API key for a Security serverless role. Stateful has no such built-in role,
 * so the descriptor from the serverless `roles.yml` is created as a custom role.
 */
export const getSecurityRoleApiKey = async (
  requestAuth: SecurityRoleApiKeyProvider,
  config: ScoutTestConfig,
  roleName: string
): Promise<RoleApiCredentials> => {
  if (config.serverless) {
    return requestAuth.getApiKey(roleName);
  }

  const roleDescriptors = readRolesDescriptorsFromResource(
    `${SERVERLESS_ROLES_ROOT_PATH}/security/roles.yml`
  ) as Record<string, ElasticsearchRoleDescriptor>;
  const roleDescriptor = roleDescriptors[roleName];
  if (!roleDescriptor) {
    throw new Error(`No role descriptor found for ${roleName}`);
  }
  return requestAuth.getApiKeyForCustomRole(roleDescriptor);
};
