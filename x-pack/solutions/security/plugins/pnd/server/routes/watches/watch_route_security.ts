/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';

/**
 * Live watch routes project managed Workflows. Require the same privilege pair
 * Workflows uses for managed reads (`read` + `readManaged`). Execution history
 * is optional enrichment and must not gate the route — projection already
 * soft-fails when execution reads are unavailable.
 *
 * Do not AND `readExecution` / `readManagedExecution` here; that would 403
 * users who can list managed watches but lack execution privileges.
 */
export const getLiveWatchReadPrivileges = () => [
  PND_API_PRIVILEGE_READ,
  WorkflowsManagementApiActions.read,
  WorkflowsManagementApiActions.readManaged,
];

export const getWatchRoutePrivileges = (useMockData: boolean) =>
  useMockData ? [PND_API_PRIVILEGE_READ] : getLiveWatchReadPrivileges();
