/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import type { UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import { readRolesDescriptorsFromResource, SERVERLESS_ROLES_ROOT_PATH } from '@kbn/es';
import type {
  ElasticsearchRoleDescriptor,
  KbnClient,
  SamlAuth,
  ScoutTestConfig,
} from '@kbn/scout-security';
import type { EndpointManagementApi } from '@kbn/security-solution-test-api-clients/scout';
import type { PolicyData } from '../../../../../common/endpoint/types';
import { scopeKbnClientToSpace } from '../../../edr_response_actions/common/scope_kbn_client_to_space';

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

/**
 * Role that seeds the note: it has policy management write and, unlike `admin`, it is in the
 * users file of the Cloud runs.
 */
export const NOTE_WRITER_ROLE = 'endpoint_operations_analyst';

/**
 * Cookie header of a {@link NOTE_WRITER_ROLE} user. Stateful has no such built-in role, so, as
 * `browserAuth.loginAsSecurityRole` does, its serverless descriptor becomes the worker's custom
 * role, which the browser user of the worker also holds.
 */
export const getNoteWriterAuthHeaders = async (
  samlAuth: SamlAuth,
  config: ScoutTestConfig
): Promise<Record<string, string>> => {
  if (config.serverless) {
    const { cookieHeader } = await samlAuth.asInteractiveUser(NOTE_WRITER_ROLE);
    return cookieHeader;
  }
  const roleDescriptors = readRolesDescriptorsFromResource(
    `${SERVERLESS_ROLES_ROOT_PATH}/security/roles.yml`
  ) as Record<string, ElasticsearchRoleDescriptor>;
  const roleDescriptor = roleDescriptors[NOTE_WRITER_ROLE];
  if (!roleDescriptor) {
    throw new Error(`No role descriptor found for ${NOTE_WRITER_ROLE}`);
  }
  const { cookieHeader } = await samlAuth.asInteractiveUser(roleDescriptor);
  return cookieHeader;
};

interface SetProtectionUpdatesNoteParams {
  endpointManagementApi: EndpointManagementApi;
  authHeaders: Record<string, string>;
  spaceId: string;
  policyId: string;
  note: string;
}

/** Creates or replaces the protection updates note of a package policy of `spaceId`. */
export const setProtectionUpdatesNote = async ({
  endpointManagementApi,
  authHeaders,
  spaceId,
  policyId,
  note,
}: SetProtectionUpdatesNoteParams): Promise<void> => {
  const { statusCode } = await endpointManagementApi.createUpdateProtectionUpdatesNote(
    { params: { package_policy_id: policyId }, body: { note } },
    { headers: authHeaders, kibanaSpace: spaceId }
  );
  if (statusCode !== 200) {
    throw new Error(`Setting the protection updates note returned ${statusCode}`);
  }
};
