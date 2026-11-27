/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import type { UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import type { KbnClient } from '@kbn/scout-security';
import type { PolicyData } from '../../../../../common/endpoint/types';
import { scopeKbnClientToSpace } from '../../../edr_response_actions/common/scope_kbn_client_to_space';

export const DISPLAY_DATE_FORMAT = 'MMMM DD, YYYY';
export const MANIFEST_DATE_FORMAT = 'YYYY-MM-DD';

/** Sets `global_manifest_version` (`latest` or `YYYY-MM-DD`) on a package policy of `spaceId`. */
export const setManifestVersion = async (
  kbnClient: KbnClient,
  spaceId: string,
  policyId: string,
  version: string
): Promise<void> => {
  const spaceClient = scopeKbnClientToSpace(kbnClient, spaceId);
  const headers = { 'elastic-api-version': API_VERSIONS.public.v1 };
  const {
    data: { item },
  } = await spaceClient.request<{ item: PolicyData }>({
    method: 'GET',
    path: packagePolicyRouteService.getInfoPath(policyId),
    headers,
  });
  const {
    id: _id,
    version: _version,
    revision: _revision,
    created_at: _createdAt,
    created_by: _createdBy,
    updated_at: _updatedAt,
    updated_by: _updatedBy,
    ...policy
  } = item;
  policy.inputs[0].config.policy.value.global_manifest_version = version;
  const update: UpdatePackagePolicy = policy;

  await spaceClient.request({
    method: 'PUT',
    path: packagePolicyRouteService.getUpdatePath(policyId),
    headers,
    body: update,
  });
};

/** Creates or replaces the protection updates note of a package policy of `spaceId`. */
export const setProtectionUpdatesNote = async (
  kbnClient: KbnClient,
  spaceId: string,
  policyId: string,
  note: string
): Promise<void> => {
  await scopeKbnClientToSpace(kbnClient, spaceId).request({
    method: 'POST',
    path: `/api/endpoint/protection_updates_note/${policyId}`,
    headers: { 'elastic-api-version': API_VERSIONS.public.v1 },
    body: { note },
  });
};
