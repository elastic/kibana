/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { ComponentStatus } from '../../common/constants';
import {
  ERROR_SENTRY_CAPTURE_WORKFLOW_ID,
  ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW_ID,
  ERROR_SENTRY_ASK_RALPH_WORKFLOW_ID,
  ERROR_SENTRY_INTROSPECT_WORKFLOW_ID,
  ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID,
} from '../../common/constants';

const WORKFLOW_LABELS: Record<string, string> = {
  [ERROR_SENTRY_CAPTURE_WORKFLOW_ID]: 'Capture log error patterns workflow',
  [ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW_ID]: 'Escalate to GitHub workflow',
  [ERROR_SENTRY_ASK_RALPH_WORKFLOW_ID]: 'Ask Detective Ralph workflow',
  [ERROR_SENTRY_INTROSPECT_WORKFLOW_ID]: 'Introspect log configuration workflow',
  [ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID]: 'Detective Ralph investigation workflow',
};

// Managed workflow documents use the definition ID as the Elasticsearch _id,
// which the workflows management UI uses as the URL slug.
const WORKFLOW_LINKS: Record<string, string> = {
  [ERROR_SENTRY_CAPTURE_WORKFLOW_ID]: `/app/workflows/${ERROR_SENTRY_CAPTURE_WORKFLOW_ID}`,
  [ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW_ID]: `/app/workflows/${ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW_ID}`,
  [ERROR_SENTRY_ASK_RALPH_WORKFLOW_ID]: `/app/workflows/${ERROR_SENTRY_ASK_RALPH_WORKFLOW_ID}`,
  [ERROR_SENTRY_INTROSPECT_WORKFLOW_ID]: `/app/workflows/${ERROR_SENTRY_INTROSPECT_WORKFLOW_ID}`,
  [ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID]: `/app/workflows/${ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID}`,
};

const WORKFLOW_COMPONENT_IDS = {
  [ERROR_SENTRY_CAPTURE_WORKFLOW_ID]: 'workflow_capture',
  [ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW_ID]: 'workflow_escalate_github',
  [ERROR_SENTRY_ASK_RALPH_WORKFLOW_ID]: 'workflow_ask_ralph',
  [ERROR_SENTRY_INTROSPECT_WORKFLOW_ID]: 'workflow_introspect',
  [ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID]: 'workflow_ralph_investigation',
} as const;

export const getWorkflowsStatus = async (
  managedClient: PluginScopedManagedWorkflowsApi
): Promise<ComponentStatus[]> => {
  const workflowIds = [
    ERROR_SENTRY_CAPTURE_WORKFLOW_ID,
    ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW_ID,
    ERROR_SENTRY_ASK_RALPH_WORKFLOW_ID,
    ERROR_SENTRY_INTROSPECT_WORKFLOW_ID,
    ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID,
  ] as const;

  return Promise.all(
    workflowIds.map(async (workflowId) => {
      const { status } = await managedClient.getWorkflowStatus(workflowId, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });

      const componentId = WORKFLOW_COMPONENT_IDS[workflowId];
      const label = WORKFLOW_LABELS[workflowId];

      const stateMap = {
        intact: 'ok',
        missing: 'missing',
        disabled: 'warning',
        invalid: 'error',
        drifted: 'drifted',
        not_managed: 'error',
      } as const;

      const repairable = status === 'missing' || status === 'drifted' || status === 'invalid';
      return {
        id: componentId,
        label,
        state: stateMap[status] ?? 'error',
        detail: status !== 'intact' ? `Workflow status: ${status}` : undefined,
        repairable,
        actionLink: !repairable ? WORKFLOW_LINKS[workflowId] : undefined,
      } satisfies ComponentStatus;
    })
  );
};
