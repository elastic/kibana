/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { WorkflowsManagementApiActions } from '@kbn/workflows';

/**
 * Request-scoped authorization for the managed-Workflows reads the Watches projection performs.
 *
 * The underlying Workflows Management read API (`getWorkflows` / `getWorkflow` /
 * `getWorkflowExecution*`) runs as the Kibana **internal** user and only space-scopes; it does
 * not evaluate the caller's privileges. Enforcing authz solely at the PND route boundary therefore
 * leaves the projection layer able to read managed catalog and execution data with no per-caller
 * check. These helpers push that check into the projection by reading `request.authzResult` — the
 * per-request privilege map core populates from the route's `requiredPrivileges` /
 * `extendedPrivileges` — exactly the mechanism Workflows' own routes use.
 */
const hasPrivilege = (request: KibanaRequest, action: WorkflowsManagementApiActions): boolean =>
  request.authzResult?.[action] === true;

/** The caller may read managed workflow definitions (the managed catalog list/detail). */
export const canReadManagedWorkflows = (request: KibanaRequest): boolean =>
  hasPrivilege(request, WorkflowsManagementApiActions.read) &&
  hasPrivilege(request, WorkflowsManagementApiActions.readManaged);

/** The caller may read (unmanaged) workflow execution history. */
export const canReadWorkflowExecutions = (request: KibanaRequest): boolean =>
  hasPrivilege(request, WorkflowsManagementApiActions.readExecution);

/** The caller may read the execution history of managed workflows (the watch run enrichment). */
export const canReadManagedWorkflowExecutions = (request: KibanaRequest): boolean =>
  hasPrivilege(request, WorkflowsManagementApiActions.readExecution) &&
  hasPrivilege(request, WorkflowsManagementApiActions.readManagedExecution);

/**
 * Thrown when a projection read requires the managed-read privilege pair the caller lacks. Carries
 * a `statusCode` so the route can surface a clean `403` rather than a generic `500` (or a blank
 * page). In practice the live watch routes already gate on the same privileges, so this is
 * defense-in-depth that also makes the projection safe to call from any future route.
 */
export class WorkflowsManagedReadForbiddenError extends Error {
  public readonly statusCode = 403;

  constructor(message = 'Missing Workflows managed read privilege') {
    super(message);
    this.name = 'WorkflowsManagedReadForbiddenError';
  }
}

/** Assert the caller may read managed workflows, throwing {@link WorkflowsManagedReadForbiddenError} otherwise. */
export const assertCanReadManagedWorkflows = (request: KibanaRequest): void => {
  if (!canReadManagedWorkflows(request)) {
    throw new WorkflowsManagedReadForbiddenError();
  }
};

/** Assert the caller may read managed workflow executions. */
export const assertCanReadManagedWorkflowExecutions = (request: KibanaRequest): void => {
  if (!canReadManagedWorkflowExecutions(request)) {
    throw new WorkflowsManagedReadForbiddenError(
      'Missing Workflows managed execution read privilege'
    );
  }
};

/**
 * Assert managed-read only when the resolved workflow is itself managed (mirrors Workflows core's
 * `assertCanReadManagedWorkflow`). Unmanaged (custom) watches carry no managed-read requirement, so
 * the same call is safe on the delete path where only the base workflow is fetched.
 */
export const assertCanReadManagedWorkflow = (
  request: KibanaRequest,
  workflow: { managed?: boolean } | null | undefined
): void => {
  if (workflow?.managed === true) {
    assertCanReadManagedWorkflows(request);
  }
};
