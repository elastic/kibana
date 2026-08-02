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
import { PND_API_PRIVILEGE_READ, PND_API_PRIVILEGE_WRITE } from '../../../common/constants';

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
 * Settings writes only ever reach the in-memory store, so they need no Workflows privileges. The
 * routes themselves return 501 when `useMockData` is false, which is what keeps this safe.
 */
export const getWatchWriteRouteAuthz = (): RouteAuthz => ({
  requiredPrivileges: [PND_API_PRIVILEGE_WRITE],
});

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
