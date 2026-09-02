/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID, WorkflowsManagementUiActions } from '@kbn/workflows';
import { useKibana } from '../../../common/lib/kibana';

export interface UseWorkflowsMigrationPrivileges {
  canCreate: boolean;
  canExecute: boolean;
  canRead: boolean;
}

/**
 * Workflows UI capabilities for save / list / run of Tines-translated workflows.
 */
export const useWorkflowsMigrationPrivileges = (): UseWorkflowsMigrationPrivileges => {
  const { application } = useKibana().services;

  return useMemo(() => {
    const caps = application.capabilities[WORKFLOWS_MANAGEMENT_FEATURE_ID];
    return {
      canCreate: caps?.[WorkflowsManagementUiActions.create] === true,
      canExecute: caps?.[WorkflowsManagementUiActions.execute] === true,
      canRead: caps?.[WorkflowsManagementUiActions.read] === true,
    };
  }, [application.capabilities]);
};
