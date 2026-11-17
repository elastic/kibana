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
import { ENDPOINT_ALERTS_INDEX } from '../../../../scripts/endpoint/common/constants';
import type { HostVmExecResponse } from '../../../../scripts/endpoint/common/types';
import { getHostVmClient } from '../../../../scripts/endpoint/common/vm_services';

const DETECTION_ALERTS_INDEX = `${DEFAULT_ALERTS_INDEX}-default`;
const HOST_COMMAND_TIMEOUT_MS = 60_000;

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

/**
 * Endpoint alerts on `fileName` for `agentId`. The enrolled host is shared by every spec in
 * the worker, so `agent.id` alone could match an alert another trigger raised.
 */
export const countEndpointAlertsForFile = async (
  esClient: EsClient,
  agentId: string,
  fileName: string
): Promise<number> => {
  const { count } = await esClient.count({
    index: ENDPOINT_ALERTS_INDEX,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: [{ term: { 'agent.id': agentId } }, { term: { 'file.name': fileName } }],
      },
    },
  });
  return count;
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

/** Detection Engine alerts the Endpoint Security rule created on `fileName` for `agentId`. */
export const getEndpointSecurityAlertsQuery = (agentId: string, fileName: string) => ({
  bool: {
    filter: [
      { term: { 'agent.id': agentId } },
      { term: { 'agent.type': 'endpoint' } },
      { term: { 'kibana.alert.rule.rule_id': ELASTIC_SECURITY_RULE_ID } },
      { term: { 'file.name': fileName } },
    ],
  },
});

/** Deletes only the alerts `getEndpointSecurityAlertsQuery` matches, so other specs' alerts stay. */
export const deleteEndpointSecurityAlerts = async (
  esClient: EsClient,
  agentId: string,
  fileName: string
): Promise<void> => {
  await esClient.deleteByQuery({
    index: DETECTION_ALERTS_INDEX,
    ignore_unavailable: true,
    query: getEndpointSecurityAlertsQuery(agentId, fileName),
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
