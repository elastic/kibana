/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { WorkflowsManagementApiActions } from '@kbn/workflows';

/**
 * The API action privileges the acting principal must hold (evaluated together)
 * before Attack Discovery 2.0 runs any workflow.
 *
 * Built from canonical constants so there are no magic strings:
 * - `WorkflowsManagementApiActions.execute` (`workflowsManagement:execute`)
 * - `WorkflowsManagementApiActions.read` (`workflowsManagement:read`)
 * - `ATTACK_DISCOVERY_API_ACTION_ALL` (`securitySolution-attackDiscoveryAll`)
 */
export const WORKFLOW_EXECUTION_REQUIRED_API_PRIVILEGES = [
  WorkflowsManagementApiActions.execute,
  WorkflowsManagementApiActions.read,
  ATTACK_DISCOVERY_API_ACTION_ALL,
] as const;

/**
 * Thrown when the acting principal is missing one or more of the API action
 * privileges required to execute Attack Discovery 2.0 workflows. Carries the
 * missing privileges so callers (e.g. the ad hoc route) can surface a 403.
 */
export class WorkflowExecutionAuthorizationError extends Error {
  public readonly missingPrivileges: readonly string[];

  constructor(missingPrivileges: readonly string[]) {
    super(
      `Unauthorized to execute Attack Discovery workflows; missing required privilege(s): ${missingPrivileges.join(
        ', '
      )}`
    );

    this.name = 'WorkflowExecutionAuthorizationError';
    this.missingPrivileges = missingPrivileges;
  }
}

export interface AssertAuthorizedToExecuteWorkflowsParams {
  authz: SecurityPluginStart['authz'];
  request: KibanaRequest;
  spaceId: string;
}

/**
 * Asserts that the principal behind `request` holds ALL of
 * `WORKFLOW_EXECUTION_REQUIRED_API_PRIVILEGES` in `spaceId`. Resolves when
 * authorized; throws `WorkflowExecutionAuthorizationError` (carrying the
 * missing privileges) otherwise.
 */
export const assertAuthorizedToExecuteWorkflows = async ({
  authz,
  request,
  spaceId,
}: AssertAuthorizedToExecuteWorkflowsParams): Promise<void> => {
  const requiredKibanaActions = WORKFLOW_EXECUTION_REQUIRED_API_PRIVILEGES.map((apiPrivilege) => ({
    apiPrivilege,
    kibanaAction: authz.actions.api.get(apiPrivilege),
  }));

  const { hasAllRequested, privileges } = await authz
    .checkPrivilegesWithRequest(request)
    .atSpace(spaceId, {
      kibana: requiredKibanaActions.map(({ kibanaAction }) => kibanaAction),
    });

  if (hasAllRequested) {
    return;
  }

  const unauthorizedKibanaActions = new Set(
    privileges.kibana.filter(({ authorized }) => !authorized).map(({ privilege }) => privilege)
  );

  const missingPrivileges = requiredKibanaActions
    .filter(({ kibanaAction }) => unauthorizedKibanaActions.has(kibanaAction))
    .map(({ apiPrivilege }) => apiPrivilege);

  throw new WorkflowExecutionAuthorizationError(missingPrivileges);
};
