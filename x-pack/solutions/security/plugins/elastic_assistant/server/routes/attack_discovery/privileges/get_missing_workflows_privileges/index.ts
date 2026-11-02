/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { AttackDiscoveryMissingFeaturePrivileges } from '@kbn/elastic-assistant-common';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID, WorkflowsManagementApiActions } from '@kbn/workflows';

/**
 * The workflows API action privileges Attack Discovery 2.0 requires, paired with
 * the short privilege name surfaced to callers (matching the `read` / `execute`
 * naming used by the least-privilege route matrix).
 */
const REQUIRED_WORKFLOWS_API_PRIVILEGES = [
  { apiPrivilege: WorkflowsManagementApiActions.read, privilege: 'read' },
  { apiPrivilege: WorkflowsManagementApiActions.execute, privilege: 'execute' },
] as const;

export interface GetMissingWorkflowsPrivilegesParams {
  authz: SecurityPluginStart['authz'];
  request: KibanaRequest;
  spaceId: string;
}

/**
 * Reports which of the workflows privileges (`workflowsManagement:read` /
 * `workflowsManagement:execute`) required by Attack Discovery 2.0 the principal
 * behind `request` is missing in `spaceId`. Returns an empty array when all
 * required workflows privileges are held, or a single
 * `AttackDiscoveryMissingFeaturePrivileges` entry (keyed by the workflows
 * management feature id) enumerating the missing privileges otherwise.
 */
export const getMissingWorkflowsPrivileges = async ({
  authz,
  request,
  spaceId,
}: GetMissingWorkflowsPrivilegesParams): Promise<AttackDiscoveryMissingFeaturePrivileges[]> => {
  const requiredKibanaActions = REQUIRED_WORKFLOWS_API_PRIVILEGES.map(
    ({ apiPrivilege, privilege }) => ({
      kibanaAction: authz.actions.api.get(apiPrivilege),
      privilege,
    })
  );

  const { hasAllRequested, privileges } = await authz
    .checkPrivilegesWithRequest(request)
    .atSpace(spaceId, {
      kibana: requiredKibanaActions.map(({ kibanaAction }) => kibanaAction),
    });

  if (hasAllRequested) {
    return [];
  }

  const unauthorizedKibanaActions = new Set(
    privileges.kibana.filter(({ authorized }) => !authorized).map(({ privilege }) => privilege)
  );

  const missingPrivileges = requiredKibanaActions
    .filter(({ kibanaAction }) => unauthorizedKibanaActions.has(kibanaAction))
    .map(({ privilege }) => privilege);

  if (missingPrivileges.length === 0) {
    return [];
  }

  return [{ feature_id: WORKFLOWS_MANAGEMENT_FEATURE_ID, privileges: missingPrivileges }];
};
