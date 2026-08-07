/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { PND_API_PRIVILEGE_READ, PND_API_PRIVILEGE_WRITE } from '../../../common/constants';

/**
 * Live watch routes project Workflows. Execution history
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

export const getWatchHistoryExtendedPrivileges = (useMockData: boolean) =>
  useMockData
    ? []
    : [
        WorkflowsManagementApiActions.readExecution,
        WorkflowsManagementApiActions.readManagedExecution,
      ];

export const getWatchSetupPrivileges = (useMockData: boolean) =>
  useMockData
    ? [PND_API_PRIVILEGE_WRITE]
    : [
        PND_API_PRIVILEGE_WRITE,
        WorkflowsManagementApiActions.create,
        WorkflowsManagementApiActions.update,
      ];

export const getLiveWatchWritePrivileges = () => [
  PND_API_PRIVILEGE_WRITE,
  WorkflowsManagementApiActions.update,
  WorkflowsManagementApiActions.read,
];

export const getWatchWritePrivileges = (useMockData: boolean) =>
  useMockData ? [PND_API_PRIVILEGE_WRITE] : getLiveWatchWritePrivileges();
