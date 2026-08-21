/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_INVESTIGATE_RULES_WORKFLOW_ID } from '@kbn/workflows/managed';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SecurityManagedWorkflowsClient } from '../managed_workflows';

/**
 * Installs the investigate-rules PoC workflow once, in the default space. The workflow ships
 * disabled (`restorable` enablement): enabling it in the Workflows UI is the user's explicit
 * opt-in, which also creates the API key its scheduled trigger runs under.
 *
 * Not installed globally: the post-save scheduler sync resolves workflows in the enabling
 * request's space without including global ones (`getEsWorkflowForScheduler` →
 * `buildWorkflowFilters` with no `includeGlobal`), so a global workflow's `scheduled` trigger
 * never gets a Task Manager task. Space-scoped installs are also how the other scheduled
 * managed workflows (significant_events) are shipped. PoC scope: default space only.
 */
export const installSecurityInvestigateRulesWorkflow = async ({
  managedWorkflowsClient,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
}): Promise<void> => {
  await managedWorkflowsClient.install(SECURITY_INVESTIGATE_RULES_WORKFLOW_ID, {
    spaceId: DEFAULT_SPACE_ID,
  });
};
