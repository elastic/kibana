/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetOnePackagePolicyResponse,
  UpdatePackagePolicy,
  UpdatePackagePolicyResponse,
} from '@kbn/fleet-plugin/common';
import { packagePolicyRouteService, API_VERSIONS } from '@kbn/fleet-plugin/common';
import { request } from './common';
import { ProtectionModes } from '../../../../common/endpoint/types';

/**
 * Updates the given Endpoint policy and enables all of the policy protections
 * @param endpointPolicyId
 */
export const enableAllPolicyProtections = (
  endpointPolicyId: string
): Cypress.Chainable<Cypress.Response<UpdatePackagePolicyResponse>> => {
  return request<GetOnePackagePolicyResponse>({
    method: 'GET',
    url: packagePolicyRouteService.getInfoPath(endpointPolicyId),
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
  }).then(({ body: { item: endpointPolicy } }) => {
    const {
      created_by: _createdBy,
      created_at: _createdAt,
      updated_at: _updatedAt,
      updated_by: _updatedBy,
      id,
      version,
      revision,
      ...restOfPolicy
    } = endpointPolicy;

    const updatedEndpointPolicy: UpdatePackagePolicy = restOfPolicy;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const policy = updatedEndpointPolicy!.inputs[0]!.config!.policy.value;

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

    return request<UpdatePackagePolicyResponse>({
      method: 'PUT',
      url: packagePolicyRouteService.getUpdatePath(endpointPolicyId),
      body: updatedEndpointPolicy,
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
    });
  });
};

export const setCustomProtectionUpdatesManifestVersion = (
  endpointPolicyId: string,
  manifestVersion: string
) => {
  return request<GetOnePackagePolicyResponse>({
    method: 'GET',
    url: packagePolicyRouteService.getInfoPath(endpointPolicyId),
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
  }).then(({ body: { item: endpointPolicy } }) => {
    const {
      created_by: _createdBy,
      created_at: _createdAt,
      updated_at: _updatedAt,
      updated_by: _updatedBy,
      id,
      version,
      revision,
      ...restOfPolicy
    } = endpointPolicy;

    const updatedEndpointPolicy: UpdatePackagePolicy = restOfPolicy;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const policy = updatedEndpointPolicy!.inputs[0]!.config!.policy.value;

    policy.global_manifest_version = manifestVersion;

    return request<UpdatePackagePolicyResponse>({
      method: 'PUT',
      url: packagePolicyRouteService.getUpdatePath(endpointPolicyId),
      body: updatedEndpointPolicy,
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
    });
  });
};

export const setCustomProtectionUpdatesNote = (
  endpointPolicyId: string,
  note: string
): Cypress.Chainable<Cypress.Response<{ note: string }>> => {
  return request<{ note: string }>({
    method: 'POST',
    url: `/api/endpoint/protection_updates_note/${endpointPolicyId}`,
    body: { note },
    headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
  });
};
