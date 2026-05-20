/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy, CreatePackagePolicyResponse } from '@kbn/fleet-plugin/common';
import { API_VERSIONS } from '@kbn/fleet-plugin/common';
import type { KbnClient } from '@kbn/test';
import type {
  GetEnrollmentAPIKeysResponse,
  CreateAgentPolicyResponse,
} from '@kbn/fleet-plugin/common/types';
import type { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';

export const DEFAULT_HEADERS = Object.freeze({
  'x-elastic-internal-product': 'security-solution',
});

export const getInstalledIntegration = async (kbnClient: KbnClient, integrationName: string) => {
  const {
    data: { item },
  } = await kbnClient.request<{ item: PackagePolicy }>({
    method: 'GET',
    path: `/api/fleet/epm/packages/${integrationName}`,
    headers: {
      ...DEFAULT_HEADERS,
      'elastic-api-version': API_VERSIONS.public.v1,
    },
  });

  return item;
};

export const createAgentPolicy = async (
  kbnClient: KbnClient,
  log: ToolingLog,
  agentPolicyName = 'Osquery policy',
  integrationName: string = 'osquery_manager'
) => {
  log.info(chalk.bold(`Creating "${agentPolicyName}" agent policy`));
  const {
    data: {
      item: { id: agentPolicyId },
    },
  } = await kbnClient.request<CreateAgentPolicyResponse>({
    method: 'POST',
    path: `/api/fleet/agent_policies?sys_monitoring=true`,
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
    body: {
      name: agentPolicyName,
      description: '',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
      inactivity_timeout: 1209600,
    },
  });
  log.indent(4, () => log.info(`Created "${agentPolicyName}" agent policy`));

  log.info(
    chalk.bold(
      `Adding "${integrationName}" integration to agent policy "${agentPolicyName}" with id ${agentPolicyId}`
    )
  );

  await addIntegrationToAgentPolicy(kbnClient, agentPolicyId, agentPolicyName, integrationName);
  log.indent(4, () =>
    log.info(
      `Added "${integrationName}" integration to agent policy "${agentPolicyName}" with id ${agentPolicyId}`
    )
  );

  log.info(
    chalk.bold(
      `Getting agent enrollment key for agent policy "${agentPolicyName}" with id ${agentPolicyId}`
    )
  );
  const { data: apiKeys } = await kbnClient.request<GetEnrollmentAPIKeysResponse>({
    method: 'GET',
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
    path: '/api/fleet/enrollment_api_keys',
  });
  log.indent(4, () =>
    log.info(
      `Got agent enrollment key for agent policy "${agentPolicyName}" with id ${agentPolicyId}`
    )
  );
  return apiKeys.items[0].api_key;
};

export const addIntegrationToAgentPolicy = async (
  kbnClient: KbnClient,
  agentPolicyId: string,
  agentPolicyName: string,
  integrationName: string = 'osquery_manager'
) => {
  const { version: integrationVersion } = await getInstalledIntegration(kbnClient, integrationName);

  return kbnClient.request<CreatePackagePolicyResponse>({
    method: 'POST',
    path: '/api/fleet/package_policies',
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
    body: {
      policy_id: agentPolicyId,
      package: {
        name: integrationName,
        version: integrationVersion,
      },
      name: `Policy for ${agentPolicyName}`,
      description: '',
      namespace: 'default',
      inputs: {
        'osquery_manager-osquery': {
          enabled: true,
          streams: {},
        },
      },
    },
  });
};

// Pinned to 9.4.1 as a workaround for a Fleet Server regression in 9.5.0-SNAPSHOT.
// Elastic Agent main bumped elastic-agent-libs to v0.43.0 on 2026-05-19, which
// wires CertReloader into LoadTLSServerConfig and rejects the inline PEM that
// Fleet Server's managed bootstrap path auto-generates:
//   "failed to initialize TLS cert reloader: certificate must be a file path,
//    not an inline PEM"
// Unpin once Agent vendors elastic-agent-libs v0.43.1+ (PR #421 restored
// backward compat) and the rolling snapshot rolls forward.
// Slack: https://elastic.slack.com/archives/C06TGC6D343/p1779259445336199
const PINNED_AGENT_VERSION = '9.4.1';

export const getLatestAvailableAgentVersion = async (
  _kbnClient: KbnClient,
  log: ToolingLog
): Promise<string> => {
  log.info(`Using pinned Elastic Agent version ${PINNED_AGENT_VERSION} (see utils.ts comment)`);
  return PINNED_AGENT_VERSION;
};

export const generateRandomString = (length: number) => {
  return [...Array(length)].map(() => Math.random().toString(36)[2]).join('');
};
