/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetOnePackagePolicyResponse, UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import { API_VERSIONS, packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import type { KbnClient, ScoutLogger } from '@kbn/scout-security';
import {
  deleteIndexedFleetEndpointPolicies,
  indexFleetEndpointPolicy,
  type IndexedFleetEndpointPolicyResponse,
} from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type { PolicyData } from '../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../common/endpoint/types';

export const createEndpointPolicy = async (
  kbnClient: KbnClient,
  log: ScoutLogger,
  name: string
): Promise<IndexedFleetEndpointPolicyResponse> => {
  log.info(`[edr_real_fleet] creating endpoint policy '${name}'`);
  return indexFleetEndpointPolicy(kbnClient, name, undefined, undefined, log);
};

export const deleteEndpointPolicy = async (
  kbnClient: KbnClient,
  indexed: IndexedFleetEndpointPolicyResponse
): Promise<void> => {
  await deleteIndexedFleetEndpointPolicies(kbnClient, indexed);
};

export const getCreatedPackagePolicy = (
  indexed: IndexedFleetEndpointPolicyResponse
): PolicyData => {
  const policy = indexed.integrationPolicies[0];
  if (!policy) {
    throw new Error('Expected an endpoint package policy to be created');
  }
  return policy;
};

/**
 * Same protection flip as Cypress `tasks/endpoint_policy.ts`, via kbnClient.
 */
export const enableAllPolicyProtections = async (
  kbnClient: KbnClient,
  endpointPolicyId: string
): Promise<void> => {
  const { data } = await kbnClient.request<GetOnePackagePolicyResponse>({
    method: 'GET',
    path: packagePolicyRouteService.getInfoPath(endpointPolicyId),
    headers: { 'elastic-api-version': API_VERSIONS.public.v1 },
    retries: 0,
  });

  const {
    created_by: _createdBy,
    created_at: _createdAt,
    updated_at: _updatedAt,
    updated_by: _updatedBy,
    id: _id,
    version: _version,
    revision: _revision,
    ...restOfPolicy
  } = data.item;

  const updatedEndpointPolicy: UpdatePackagePolicy = restOfPolicy;
  const policy = updatedEndpointPolicy.inputs[0]?.config?.policy.value;
  if (!policy) {
    throw new Error(`Package policy ${endpointPolicyId} has no endpoint policy config`);
  }

  policy.mac.malware.mode = ProtectionModes.prevent;
  policy.windows.malware.mode = ProtectionModes.prevent;
  policy.linux.malware.mode = ProtectionModes.prevent;

  policy.mac.memory_protection.mode = ProtectionModes.prevent;
  policy.windows.memory_protection.mode = ProtectionModes.prevent;
  policy.linux.memory_protection.mode = ProtectionModes.prevent;

  policy.mac.behavior_protection.mode = ProtectionModes.prevent;
  policy.windows.behavior_protection.mode = ProtectionModes.prevent;
  policy.linux.behavior_protection.mode = ProtectionModes.prevent;

  policy.windows.ransomware.mode = ProtectionModes.prevent;

  await kbnClient.request({
    method: 'PUT',
    path: packagePolicyRouteService.getUpdatePath(endpointPolicyId),
    headers: { 'elastic-api-version': API_VERSIONS.public.v1 },
    body: updatedEndpointPolicy,
    retries: 0,
  });
};
