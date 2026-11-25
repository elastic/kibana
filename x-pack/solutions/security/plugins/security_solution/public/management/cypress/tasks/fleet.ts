/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Agent,
  GetAgentsResponse,
  GetInfoResponse,
  GetPackagePoliciesResponse,
  CreateAgentPolicyResponse,
} from '@kbn/fleet-plugin/common';
import {
  agentRouteService,
  epmRouteService,
  packagePolicyRouteService,
  API_VERSIONS,
  agentPolicyRouteService,
} from '@kbn/fleet-plugin/common';
import type {
  PostAgentReassignResponse,
  UpdateAgentPolicyResponse,
} from '@kbn/fleet-plugin/common/types';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { request } from './common';

export const getEndpointIntegrationVersion = (): Cypress.Chainable<string> =>
  request<GetInfoResponse>({
    url: epmRouteService.getInfoPath('endpoint'),
    method: 'GET',
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
  }).then((response) => response.body.item.version);

export const getAgentByHostName = (hostname: string): Cypress.Chainable<Agent> =>
  request<GetAgentsResponse>({
    url: agentRouteService.getListPath(),
    method: 'GET',
    qs: {
      kuery: `local_metadata.host.hostname: "${hostname}"`,
    },
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
  }).then((response) => response.body.items[0]);

export const reassignAgentPolicy = (
  agentId: string,
  agentPolicyId: string
): Cypress.Chainable<Cypress.Response<PostAgentReassignResponse>> =>
  request<PostAgentReassignResponse>({
    url: agentRouteService.getReassignPath(agentId),
    method: 'POST',
    body: {
      policy_id: agentPolicyId,
    },
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
  });

export const yieldEndpointPolicyRevision = (): Cypress.Chainable<number> =>
  request<GetPackagePoliciesResponse>({
    method: 'GET',
    url: packagePolicyRouteService.getListPath(),
    qs: {
      kuery: 'ingest-package-policies.package.name: endpoint',
    },
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
  }).then(({ body }) => {
    return body.items?.[0]?.revision ?? -1;
  });

export const createAgentPolicyTask = (
  version: string,
  policyPrefix?: string,
  timeout?: number
): Cypress.Chainable<IndexedFleetEndpointPolicyResponse> => {
  const policyName = `${policyPrefix || 'Reassign'} ${Math.random().toString(36).substring(2, 7)}`;

  return cy.task<IndexedFleetEndpointPolicyResponse>(
    'indexFleetEndpointPolicy',
    {
      policyName,
      endpointPackageVersion: version,
      agentPolicyName: policyName,
    },
    { timeout: timeout ?? 5 * 60 * 1000 }
  );
};

export const createAgentPolicyWithAgentTamperProtectionsEnabled = (
  overwrite?: Record<string, unknown>
) => {
  return request<CreateAgentPolicyResponse>({
    method: 'POST',
    url: agentPolicyRouteService.getCreatePath(),
    body: {
      name: `With agent tamper protection enabled ${Math.random().toString(36).substring(2, 7)}`,
      agent_features: [{ name: 'tamper_protection', enabled: true }],
      is_protected: true,
      description: 'test',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
      inactivity_timeout: 1209600,
    },
    headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
    ...(overwrite ?? {}),
  });
};

export const enableAgentTamperProtectionFeatureFlagInPolicy = (
  agentPolicyId: string,
  overwrite?: Record<string, unknown>
) => {
  return request<UpdateAgentPolicyResponse>({
    method: 'PUT',
    url: agentPolicyRouteService.getUpdatePath(agentPolicyId),
    body: {
      name: `With agent tamper protection enabled ${Math.random().toString(36).substring(2, 7)}`,
      agent_features: [{ name: 'tamper_protection', enabled: true }], // TODO: this can be removed once FF code is removed
      is_protected: true,
      description: 'test',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
      inactivity_timeout: 1209600,
    },
    headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
    ...(overwrite ?? {}),
  });
};
