/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import {
  NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  isNightshiftSupportedSpace,
  NIGHTSHIFT_UNSUPPORTED_SPACE_MESSAGE,
} from '@kbn/nightshift-shared';
import { SCHEDULED_DISCOVERY_WORKFLOW_IDS } from '../maintenance/managed_workflow_targets';
import type { BoundWorkflowsInstaller } from './bound_workflows_installer';
import { pollUntil } from './poll_until';

const RUNNING_EXECUTIONS_PAGE_SIZE = 1000;

export interface SignificantEventsScheduledWorkflowsConfig {
  detectionIntervalMinutes: number;
  detectionBucketIntervalMinutes: number;
  detectionLookbackMinutes: number;
  targetCoverageMinutes: number;
  reviewIntervalMinutes: number;
  discoveryBatchSize: number;
  maxReviewPasses: number;
  flakyRuleDetectionThreshold: number;
  flakyRuleProbeAfterMinutes: number;
  flakyRuleExemptSeverityScore: number;
}

export interface SignificantEventsScheduledWorkflowsService {
  /**
   * Reconciles scheduled Significant Events workflows for one Kibana space.
   *
   * - Enabling installs or updates the two per-space managed workflows, then
   *   enables them so Task Manager schedules their triggers.
   * - Updating while enabled re-renders the managed workflow templates with the
   *   new cadence and batch values, preserving enablement.
   * - Disabling disables both workflows and cancels non-terminal scheduled
   *   wrapper executions in that space. The per-space workflow documents stay,
   *   disabled.
   */
  ensureWorkflow(params: {
    enabled: boolean;
    request: KibanaRequest;
    spaceId: string;
    config: SignificantEventsScheduledWorkflowsConfig;
  }): Promise<void>;
}

export const createSignificantEventsScheduledWorkflowsService = ({
  logger,
  managementApi,
  installer,
}: {
  logger: Logger;
  managementApi: WorkflowsServerPluginSetup['management'];
  installer: BoundWorkflowsInstaller;
}): SignificantEventsScheduledWorkflowsService => {
  const log = logger.get('significant-events-scheduled-workflows');

  // Managed workflow document ids are global at the storage layer (the document
  // carries a `spaceId` field for filtering, but the id itself is not namespaced
  // by space). Installing the same managed workflow in more than one space would
  // therefore collide on a single shared document and fail with an OCC
  // "updated concurrently" error. Disambiguate per space with `workflowIdSuffix`
  // so each space gets its own `${managedWorkflowId}-${spaceId}` document, and
  // reference that same id for every enable/execution operation below.
  const getWorkflowDocumentId = (managedWorkflowId: string, spaceId: string) =>
    `${managedWorkflowId}-${spaceId}`;

  const getNonTerminalExecutions = async ({
    documentId,
    spaceId,
    request,
  }: {
    documentId: string;
    spaceId: string;
    request: KibanaRequest;
  }) => {
    const { results, total } = await managementApi.getClient(request).getWorkflowExecutions(
      {
        workflowId: documentId,
        statuses: [...NonTerminalExecutionStatuses],
        size: RUNNING_EXECUTIONS_PAGE_SIZE,
      },
      spaceId
    );
    return { results, total };
  };

  const cancelAndAwaitTermination = async ({
    documentId,
    spaceId,
    request,
  }: {
    documentId: string;
    spaceId: string;
    request: KibanaRequest;
  }) => {
    const { results } = await getNonTerminalExecutions({ documentId, spaceId, request });
    if (results.length === 0) {
      return;
    }

    await Promise.all(
      results.map((result) => managementApi.cancelWorkflowExecution(result.id, spaceId, request))
    );

    log.debug(
      () =>
        `Requested cancellation for ${results.length} running scheduled Significant Events execution(s)`
    );

    await pollUntil(
      () => getNonTerminalExecutions({ documentId, spaceId, request }),
      ({ total }) => total === 0
    );
  };

  const installOrUpdate = async ({
    request,
    spaceId,
    config,
  }: {
    request: KibanaRequest;
    spaceId: string;
    config: SignificantEventsScheduledWorkflowsConfig;
  }) => {
    await Promise.all([
      installer.install({
        request,
        spaceId,
        workflowId: NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID,
        values: {
          detectionIntervalMinutes: config.detectionIntervalMinutes,
          detectionBucketIntervalMinutes: config.detectionBucketIntervalMinutes,
          detectionLookbackMinutes: config.detectionLookbackMinutes,
          targetCoverageMinutes: config.targetCoverageMinutes,
        },
      }),
      installer.install({
        request,
        spaceId,
        workflowId: NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID,
        values: {
          reviewIntervalMinutes: config.reviewIntervalMinutes,
          discoveryBatchSize: config.discoveryBatchSize,
          maxReviewPasses: config.maxReviewPasses,
          flakyRuleDetectionThreshold: config.flakyRuleDetectionThreshold,
          flakyRuleProbeAfterMinutes: config.flakyRuleProbeAfterMinutes,
          flakyRuleExemptSeverityScore: config.flakyRuleExemptSeverityScore,
        },
      }),
    ]);
  };

  const setManagedEnabled = async ({
    documentId,
    enabled,
    request,
    spaceId,
  }: {
    documentId: string;
    enabled: boolean;
    request: KibanaRequest;
    spaceId: string;
  }) => {
    const existing = await managementApi.getClient(request).getWorkflow(documentId, spaceId);

    if (!existing) {
      if (enabled) {
        throw new Error(`Managed scheduled Significant Events workflow ${documentId} is missing`);
      }
      return;
    }

    if ((existing.enabled ?? false) === enabled) {
      return;
    }

    await managementApi.updateWorkflow(documentId, { enabled }, spaceId, request);
  };

  const setAllEnabled = async ({
    enabled,
    request,
    spaceId,
  }: {
    enabled: boolean;
    request: KibanaRequest;
    spaceId: string;
  }) => {
    await Promise.all(
      SCHEDULED_DISCOVERY_WORKFLOW_IDS.map((workflowId) =>
        setManagedEnabled({
          documentId: getWorkflowDocumentId(workflowId, spaceId),
          enabled,
          request,
          spaceId,
        })
      )
    );
  };

  // Through the owner: a plain update of a bound workflow needs `manage_security`.
  const disableScheduledWorkflows = async ({ spaceId }: { spaceId: string }) => {
    await Promise.all(
      SCHEDULED_DISCOVERY_WORKFLOW_IDS.map((workflowId) =>
        installer.disable({ spaceId, workflowId })
      )
    );
  };

  const cancelRunningScheduledExecutions = async ({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }) => {
    await Promise.all(
      SCHEDULED_DISCOVERY_WORKFLOW_IDS.map((workflowId) =>
        cancelAndAwaitTermination({
          documentId: getWorkflowDocumentId(workflowId, spaceId),
          spaceId,
          request,
        }).catch((err) =>
          log.warn(`Failed to cancel running scheduled Significant Events executions: ${err}`)
        )
      )
    );
  };

  return {
    async ensureWorkflow({ enabled, request, spaceId, config }) {
      // Installing enabled workflows binds work to a space, and Nightshift only runs in the
      // default one. Disabling stays allowed everywhere, so a space set up on an earlier build
      // can still be taken down.
      if (enabled && !isNightshiftSupportedSpace(spaceId)) {
        log.warn(
          `Not installing the scheduled Significant Events discovery workflows in space ${spaceId}: ${NIGHTSHIFT_UNSUPPORTED_SPACE_MESSAGE}`
        );
        return;
      }

      if (enabled) {
        await installOrUpdate({ request, spaceId, config });
        await setAllEnabled({ enabled: true, request, spaceId });
        log.info(`Enabled scheduled Significant Events discovery workflows in space ${spaceId}`);
        return;
      }

      await disableScheduledWorkflows({ spaceId });
      await cancelRunningScheduledExecutions({ request, spaceId });
      // The documents stay, switched off: deleting a bound workflow needs `manage_security`, and
      // enabling again re-renders them with the settings.
      log.info(`Disabled scheduled Significant Events discovery workflows in space ${spaceId}`);
    },
  };
};
