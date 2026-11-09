/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { Logger } from '@kbn/logging';
import {
  ALERTZERO_ACTION_WORKFLOW_IDS,
  ALERTZERO_ALERT_TRIAGE_WORKFLOW_IDS,
  ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS,
  ALERTZERO_DEMO_WORKFLOW_IDS,
  ALERTZERO_FORENSICS_WORKFLOW_IDS,
  ALERTZERO_HUNT_CHILD_WORKFLOW_IDS,
  ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW_IDS,
  ALERTZERO_PROPOSAL_WORKFLOW_IDS,
  ALERTZERO_RULE_WORKFLOW_IDS,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { ALERTZERO_MANAGED_WORKFLOW_OWNER_ID } from '../../common/constants';

/**
 * Global workflows install a few at a time. Starting all of them together fills the small
 * Elasticsearch thread pool that system-index writes share, so a login arriving in the first
 * seconds after start-up waits several seconds for its session write.
 *
 * Do not pair this limit with `refresh: 'wait_for'` on serverless. See
 * docs/managed_workflow_startup_install.md.
 */
export const GLOBAL_WORKFLOW_INSTALL_CONCURRENCY = 4;

export const initializeManagedWorkflows = async ({
  workflowsExtensions,
  logger,
  ensureAgentForSpace,
  includeDemoWorkflows = false,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
  ensureAgentForSpace?: (spaceId: string) => Promise<void>;
  /** POC Phase 5: the deterministic demo investigation and its action. */
  includeDemoWorkflows?: boolean;
}): Promise<PluginScopedManagedWorkflowsApi> => {
  const client = await workflowsExtensions.initManagedWorkflowsClient(
    ALERTZERO_MANAGED_WORKFLOW_OWNER_ID
  );
  let canReconcile = true;

  // AlertZero action catalog entries install alongside the rule workflows:
  // all are global and static.
  const globalWorkflowIds = [
    ...ALERTZERO_RULE_WORKFLOW_IDS,
    ...ALERTZERO_ACTION_WORKFLOW_IDS,
    ...ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS,
    ...ALERTZERO_FORENSICS_WORKFLOW_IDS,
    ...ALERTZERO_ALERT_TRIAGE_WORKFLOW_IDS,
    ...ALERTZERO_HUNT_CHILD_WORKFLOW_IDS,
    ...ALERTZERO_PROPOSAL_WORKFLOW_IDS,
    ...ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW_IDS,
    ...(includeDemoWorkflows ? ALERTZERO_DEMO_WORKFLOW_IDS : []),
  ];

  // One failed install must not stop the others, so each result is recorded instead of thrown.
  const globalWorkflowInstalls = await pMap(
    globalWorkflowIds,
    (id): Promise<PromiseSettledResult<void>> =>
      client.install(id, { spaceId: GLOBAL_WORKFLOW_SPACE_ID }).then(
        (): PromiseFulfilledResult<void> => ({ status: 'fulfilled', value: undefined }),
        (reason: unknown): PromiseRejectedResult => ({ status: 'rejected', reason })
      ),
    { concurrency: GLOBAL_WORKFLOW_INSTALL_CONCURRENCY }
  );
  for (const [index, result] of globalWorkflowInstalls.entries()) {
    if (result.status === 'rejected') {
      canReconcile = false;
      logger.error(
        // Covers rule and action workflows, so this stays generic.
        `Failed to install managed AlertZero workflow "${globalWorkflowIds[index]}": ${
          result.reason instanceof Error ? result.reason.message : String(result.reason)
        }`
      );
    }
  }

  if (canReconcile) {
    try {
      await client.ready();
      logger.info('AlertZero managed workflows initialized');
    } catch (error) {
      logger.warn(
        `AlertZero managed workflow reconciliation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  } else {
    logger.warn(
      'AlertZero managed workflow reconciliation skipped because initialization degraded'
    );
  }

  if (ensureAgentForSpace) {
    try {
      const states = await client.listInstalledWorkflowStates();
      const workerSpaces = [
        ...new Set(
          states
            .map((s) => s.spaceId)
            .filter((id): id is string => !!id && id !== GLOBAL_WORKFLOW_SPACE_ID)
        ),
      ];
      const agentResults = await Promise.allSettled(
        workerSpaces.map((spaceId) => ensureAgentForSpace(spaceId))
      );

      for (const [index, result] of agentResults.entries()) {
        if (result.status === 'rejected') {
          logger.warn(
            `Failed to ensure agent for space "${workerSpaces[index]}": ${
              result.reason instanceof Error ? result.reason.message : String(result.reason)
            }`
          );
        }
      }
    } catch (error) {
      logger.warn(
        `Failed to ensure agents for existing worker spaces: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return client;
};
