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
import { getAgentVersionMatchingCurrentStack } from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';
import { fetchFleetLatestAvailableAgentVersion } from '@kbn/security-solution-plugin/common/endpoint/utils/fetch_fleet_version';
import { isServerlessKibanaFlavor } from '@kbn/security-solution-plugin/common/endpoint/utils/kibana_status';

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

export const getLatestAvailableAgentVersion = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<string> => {
  const isServerless = await isServerlessKibanaFlavor(kbnClient);
  if (isServerless) {
    return fetchFleetLatestAvailableAgentVersion(kbnClient);
  }

  return getAgentVersionMatchingCurrentStack(kbnClient, log);
};

export const generateRandomString = (length: number) => {
  return [...Array(length)].map(() => Math.random().toString(36)[2]).join('');
};
