/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import semver from 'semver';
import { map } from 'lodash';
import { PackagePolicy, CreatePackagePolicyResponse, API_VERSIONS } from '@kbn/fleet-plugin/common';
import { KbnClient } from '@kbn/test';
import {
  GetEnrollmentAPIKeysResponse,
  CreateAgentPolicyResponse,
} from '@kbn/fleet-plugin/common/types';
import { ToolingLog } from '@kbn/tooling-log';

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
  agentPolicyName = 'Osquery policy'
) => {
  log.info(`Creating "${agentPolicyName}" agent policy`);

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

  log.info(`Adding integration to ${agentPolicyId}`);

  await addIntegrationToAgentPolicy(kbnClient, agentPolicyId, agentPolicyName);

  log.info('Getting agent enrollment key');
  const { data: apiKeys } = await kbnClient.request<GetEnrollmentAPIKeysResponse>({
    method: 'GET',
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
    path: '/api/fleet/enrollment_api_keys',
  });

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

/**
 * Returns the Agent version that is available for install (will check `artifacts-api.elastic.co/v1/versions`)
 * that is equal to or less than `maxVersion`.
 * @param maxVersion
 */

export const getLatestAvailableAgentVersion = async (kbnClient: KbnClient): Promise<string> => {
  const kbnStatus = await kbnClient.status.get();
  const agentVersions = await axios
    .get('https://artifacts-api.elastic.co/v1/versions')
    .then((response) => map(response.data.versions, (version) => version.split('-SNAPSHOT')[0]));

  let version =
    semver.maxSatisfying(agentVersions, `<=${kbnStatus.version.number}`) ??
    kbnStatus.version.number;

  // Add `-SNAPSHOT` if version indicates it was from a snapshot or the build hash starts
  // with `xxxxxxxxx` (value that seems to be present when running kibana from source)
  if (
    kbnStatus.version.build_snapshot ||
    kbnStatus.version.build_hash.startsWith('XXXXXXXXXXXXXXX')
  ) {
    version += '-SNAPSHOT';
  }

  return version;
};

export const generateRandomString = (length: number) => {
  return [...Array(length)].map(() => Math.random().toString(36)[2]).join('');
};
