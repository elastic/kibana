/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteAuthz } from '@kbn/core-http-server';
import {
  WorkflowsManagementApiActions,
  WorkflowsManagementOperationPrivileges,
} from '@kbn/workflows';
import {
  PND_API_PRIVILEGE_AUTONOMY_WRITE,
  PND_API_PRIVILEGE_READ,
  PND_API_PRIVILEGE_WRITE,
} from '../../../common/constants';

/**
 * Live watch routes project managed Workflows. Require the same privilege pair
 * Workflows' own managed reads require, so PND cannot become a way around them.
 *
 * Read-only: recent-run enrichment (`getWorkflowExecutions`/`getWorkflowExecution`)
 * is optional enrichment and must not gate the route — projection already
 * soft-fails when execution reads are unavailable.
 *
 * The execution privileges are declared as `extendedPrivileges` (not required):
 * they never gate the route, but core evaluates them into `request.authzResult`
 * so the projection layer can down-scope managed-execution enrichment to what the
 * caller may actually read (see {@link canReadManagedWorkflowExecutions}).
 *
 * Do not AND `readExecution` / `readManagedExecution` into `requiredPrivileges`;
 * that would 403 users who can list managed watches but lack execution privileges.
 */
export const getLiveWatchRouteAuthz = (): RouteAuthz => ({
  requiredPrivileges: [
    PND_API_PRIVILEGE_READ,
    WorkflowsManagementApiActions.read,
    WorkflowsManagementApiActions.readManaged,
  ],
  extendedPrivileges: [
    WorkflowsManagementApiActions.readExecution,
    WorkflowsManagementApiActions.readManagedExecution,
  ],
});

export const getWatchRouteAuthz = (useMockData: boolean): RouteAuthz =>
  useMockData ? { requiredPrivileges: [PND_API_PRIVILEGE_READ] } : getLiveWatchRouteAuthz();

/**
 * Worker PATCH still refuses every write and never reads Workflows, so it stays on PND-write only.
 */
export const getWatchWriteRouteAuthz = (): RouteAuthz => ({
  requiredPrivileges: [PND_API_PRIVILEGE_WRITE],
});

/**
 * Live watch PATCH installs/enables then re-reads via `get()`, which asserts managed-read from
 * `request.authzResult`. Without declaring that pair here, enable-on-save 500s after a successful
 * install. Execution reads stay extended so recent-run enrichment can down-scope.
 */
export const getLiveWatchUpdateRouteAuthz = (): RouteAuthz => ({
  requiredPrivileges: [
    PND_API_PRIVILEGE_WRITE,
    WorkflowsManagementApiActions.read,
    WorkflowsManagementApiActions.readManaged,
  ],
  extendedPrivileges: [
    WorkflowsManagementApiActions.readExecution,
    WorkflowsManagementApiActions.readManagedExecution,
  ],
});

export const getWatchUpdateRouteAuthz = (useMockData: boolean): RouteAuthz =>
  useMockData ? getWatchWriteRouteAuthz() : getLiveWatchUpdateRouteAuthz();

/**
 * Live PUT autonomy re-reads via `get()` before writing template values, which asserts
 * managed-read from `request.authzResult`. YAML no longer calls GET/PUT autonomy (dial UI
 * only), so Task Manager API keys are not a constraint — declare the same pair as live
 * PATCH. Execution reads stay extended so recent-run enrichment can down-scope.
 */
export const getLiveAutonomyWriteRouteAuthz = (): RouteAuthz => ({
  requiredPrivileges: [
    PND_API_PRIVILEGE_AUTONOMY_WRITE,
    WorkflowsManagementApiActions.read,
    WorkflowsManagementApiActions.readManaged,
  ],
  extendedPrivileges: [
    WorkflowsManagementApiActions.readExecution,
    WorkflowsManagementApiActions.readManagedExecution,
  ],
});

export const getAutonomyWriteRouteAuthz = (useMockData: boolean): RouteAuthz =>
  useMockData
    ? { requiredPrivileges: [PND_API_PRIVILEGE_AUTONOMY_WRITE] }
    : getLiveAutonomyWriteRouteAuthz();

/**
 * Routes whose body *is* managed-execution data (the HITL queue, runs, four-phase projection).
 * Unlike watch catalog reads, execution privileges cannot be optional enrichment here — they are
 * the payload. PND-read alone must not become a side-channel around Workflows execution RBAC.
 */
export const getLiveExecutionReadAuthz = (): RouteAuthz => ({
  requiredPrivileges: [
    PND_API_PRIVILEGE_READ,
    ...WorkflowsManagementOperationPrivileges.readManagedExecution,
  ],
});

/**
 * Live `_auto_respond` lists parked managed executions then resumes them. Execution read cannot be
 * optional enrichment here — the listing *is* the payload — so it is required alongside
 * autonomy-write, Workflows execute (S1/D1), and managed definition read (`get()`).
 */
export const getLiveAutoRespondRouteAuthz = (): RouteAuthz => ({
  requiredPrivileges: [
    PND_API_PRIVILEGE_AUTONOMY_WRITE,
    WorkflowsManagementApiActions.execute,
    WorkflowsManagementApiActions.readManaged,
    ...WorkflowsManagementOperationPrivileges.readManagedExecution,
  ],
});
