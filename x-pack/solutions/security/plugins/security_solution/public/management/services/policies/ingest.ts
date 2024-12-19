/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions, HttpStart } from '@kbn/core/public';
import type {
  GetAgentStatusResponse,
  GetPackagePoliciesResponse,
  GetInfoResponse,
  BulkGetAgentPoliciesResponse,
} from '@kbn/fleet-plugin/common';
import { epmRouteService, API_VERSIONS, agentPolicyRouteService } from '@kbn/fleet-plugin/common';

import type { BulkGetAgentPoliciesRequestSchema } from '@kbn/fleet-plugin/server/types';
import type { TypeOf } from '@kbn/config-schema';
import type { NewPolicyData } from '../../../../common/endpoint/types';
import type { GetPolicyResponse, UpdatePolicyResponse } from '../../pages/policy/types';

const INGEST_API_ROOT = `/api/fleet`;
export const INGEST_API_PACKAGE_POLICIES = `${INGEST_API_ROOT}/package_policies`;
export const INGEST_API_AGENT_POLICIES = `${INGEST_API_ROOT}/agent_policies`;
const INGEST_API_FLEET_AGENT_STATUS = `${INGEST_API_ROOT}/agent_status`;
export const INGEST_API_FLEET_AGENTS = `${INGEST_API_ROOT}/agents`;
export const INGEST_API_EPM_PACKAGES = `${INGEST_API_ROOT}/epm/packages`;

/**
 * Retrieves a single package policy based on ID from ingest
 * @param http
 * @param packagePolicyId
 * @param options
 */
export const sendGetPackagePolicy = (
  http: HttpStart,
  packagePolicyId: string,
  options?: HttpFetchOptions
) => {
  return http.get<GetPolicyResponse>(`${INGEST_API_PACKAGE_POLICIES}/${packagePolicyId}`, {
    ...options,
    version: API_VERSIONS.public.v1,
  });
};

/**
 * Retrieves multiple package policies by ids
 * @param http
 * @param packagePolicyIds
 * @param options
 */
export const sendBulkGetPackagePolicies = (
  http: HttpStart,
  packagePolicyIds: string[],
  options?: HttpFetchOptions
) => {
  return http.post<GetPackagePoliciesResponse>(`${INGEST_API_PACKAGE_POLICIES}/_bulk_get`, {
    ...options,
    version: API_VERSIONS.public.v1,
    body: JSON.stringify({
      ids: packagePolicyIds,
      ignoreMissing: true,
    }),
  });
};

/**
 * Updates a package policy
 *
 * @param http
 * @param packagePolicyId
 * @param packagePolicy
 * @param options
 */
export const sendPutPackagePolicy = (
  http: HttpStart,
  packagePolicyId: string,
  packagePolicy: NewPolicyData,
  options: Exclude<HttpFetchOptions, 'body'> = {}
): Promise<UpdatePolicyResponse> => {
  return http.put(`${INGEST_API_PACKAGE_POLICIES}/${packagePolicyId}`, {
    ...options,
    version: API_VERSIONS.public.v1,
    body: JSON.stringify(packagePolicy),
  });
};

/**
 * Get a status summary for all Agents that are currently assigned to a given agent policies
 *
 * @param http
 * @param policyIds
 * @param options
 */
export const sendGetFleetAgentStatusForPolicy = (
  http: HttpStart,
  /** the Agent (fleet) policy ids */
  policyIds: string[],
  options: Exclude<HttpFetchOptions, 'query'> = {}
): Promise<GetAgentStatusResponse> => {
  return http.get(INGEST_API_FLEET_AGENT_STATUS, {
    ...options,
    version: API_VERSIONS.public.v1,
    query: {
      policyIds,
    },
  });
};

/**
 * Get Endpoint Security Package information
 */
export const sendGetEndpointSecurityPackage = async (
  http: HttpStart
): Promise<GetInfoResponse['item']> => {
  const path = epmRouteService.getInfoPath('endpoint');
  const endpointPackageResponse = await http.get<GetInfoResponse>(path, {
    version: API_VERSIONS.public.v1,
  });
  const endpointPackageInfo = endpointPackageResponse.item;
  if (!endpointPackageInfo) {
    throw new Error('Endpoint package was not found.');
  }
  return endpointPackageInfo;
};

export const sendBulkGetAgentPolicies = async ({
  http,
  requestBody,
}: {
  http: HttpStart;
  requestBody: TypeOf<typeof BulkGetAgentPoliciesRequestSchema.body>;
}): Promise<BulkGetAgentPoliciesResponse> =>
  http.post<BulkGetAgentPoliciesResponse>(agentPolicyRouteService.getBulkGetPath(), {
    version: API_VERSIONS.public.v1,
    body: JSON.stringify(requestBody),
  });
