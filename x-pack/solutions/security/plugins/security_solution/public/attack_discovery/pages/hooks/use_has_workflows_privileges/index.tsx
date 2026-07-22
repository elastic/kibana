/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID, WorkflowsManagementUiActions } from '@kbn/workflows';

import type { MissingPrivileges } from '../../../../common/hooks/use_missing_privileges';
import { useKibana } from '../../../../common/lib/kibana';

const EMPTY_MISSING_PRIVILEGES: MissingPrivileges = {
  featurePrivileges: [],
  indexPrivileges: [],
};

export interface UseHasWorkflowsPrivileges {
  /** `true` when the user is allowed to execute (run) workflows. */
  hasWorkflowsExecute: boolean;
  /** `true` when the user is allowed to read workflows. */
  hasWorkflowsRead: boolean;
  /**
   * A ready-to-render `MissingPrivileges` object listing the missing workflows
   * feature privileges (empty when nothing is missing).
   */
  missingPrivileges: MissingPrivileges;
}

/**
 * Reads the `workflowsManagement` UI capabilities (`readWorkflow` / `executeWorkflow`)
 * required by Attack Discovery 2.0 surfaces, returning boolean flags plus a
 * ready-to-render `MissingPrivileges` object for the "Insufficient privileges" callout.
 *
 * The hook only evaluates capabilities when the `attackDiscoveryWorkflowsEnabled`
 * feature flag is ON. When the flag is OFF (e.g. Serverless Essentials, where the
 * feature and capabilities are absent) it is inert: it reports full access and no
 * missing privileges so nothing is gated and no callout is shown.
 */
export const useHasWorkflowsPrivileges = (): UseHasWorkflowsPrivileges => {
  const { application, featureFlags } = useKibana().services;
  const [isWorkflowsEnabled, setIsWorkflowsEnabled] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const loadFeatureFlag = async () => {
      const enabled = await featureFlags.getBooleanValue(
        'securitySolution.attackDiscoveryWorkflowsEnabled',
        false
      );

      if (!cancelled) {
        setIsWorkflowsEnabled(enabled);
      }
    };

    loadFeatureFlag();

    return () => {
      cancelled = true;
    };
  }, [featureFlags]);

  return useMemo<UseHasWorkflowsPrivileges>(() => {
    if (!isWorkflowsEnabled) {
      return {
        hasWorkflowsExecute: true,
        hasWorkflowsRead: true,
        missingPrivileges: EMPTY_MISSING_PRIVILEGES,
      };
    }

    const workflowsCapabilities = application.capabilities[WORKFLOWS_MANAGEMENT_FEATURE_ID];
    const hasWorkflowsRead = workflowsCapabilities?.[WorkflowsManagementUiActions.read] === true;
    const hasWorkflowsExecute =
      workflowsCapabilities?.[WorkflowsManagementUiActions.execute] === true;

    const missing: string[] = [
      ...(hasWorkflowsRead ? [] : ['read']),
      ...(hasWorkflowsExecute ? [] : ['execute']),
    ];

    return {
      hasWorkflowsExecute,
      hasWorkflowsRead,
      missingPrivileges: {
        featurePrivileges: missing.length > 0 ? [[WORKFLOWS_MANAGEMENT_FEATURE_ID, missing]] : [],
        indexPrivileges: [],
      },
    };
  }, [application.capabilities, isWorkflowsEnabled]);
};
