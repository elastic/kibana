/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackagePolicy, CreatePackagePolicyResponse } from '@kbn/fleet-plugin/common';
import { KbnClient } from '@kbn/test';

export const getInstalledIntegration = async (kbnClient: KbnClient, integrationName: string) => {
  const {
    data: { item },
  } = await kbnClient.request<{ item: PackagePolicy }>({
    method: 'GET',
    path: `/api/fleet/epm/packages/${integrationName}`,
  });

  return item;
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
