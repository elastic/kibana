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
import type { SignificantEventsServer } from '../../types';
import { SCHEDULED_DISCOVERY_WORKFLOW_IDS } from '../maintenance/managed_workflow_targets';
import { requireDetectionEngineAccountId } from '../service_accounts/detection_engine_account';
import { SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER } from './managed_workflow_owner';
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
   * - Enabling installs or updates the two per-space managed workflows, bound
   *   to the space's detection engine service account (refused when the space is
   *   not set up), then enables them so Task Manager schedules their triggers.
   *   Binding needs the caller to hold `manage_security`.
   * - Updating while enabled re-renders the managed workflow templates with the
   *   new cadence and batch values, preserving enablement.
   * - Disabling disables both workflows, cancels non-terminal scheduled
   *   wrapper executions in that space, and uninstalls the per-space dynamic
   *   workflow instances.
   */
  ensureWorkflow(params: {
    enabled: boolean;
    request: KibanaRequest;
    spaceId: string;
    config: SignificantEventsScheduledWorkflowsConfig;
  }): Promise<void>;
  /**
   * Renders the installed scheduled workflows of a space again with the space's
   * current detection engine account, keeping whether they are enabled. A space
   * without them is left alone.
   */
  rebind(params: {
    request: KibanaRequest;
    spaceId: string;
    config: SignificantEventsScheduledWorkflowsConfig;
  }): Promise<void>;
}

export const createSignificantEventsScheduledWorkflowsService = ({
  logger,
  managementApi,
  server,
}: {
  logger: Logger;
  managementApi: WorkflowsServerPluginSetup['management'];
  server: Pick<SignificantEventsServer, 'core' | 'workflowsExtensions'>;
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

  // Installed and removed with the caller's request: binding a workflow to the account needs it.
  const getManagedWorkflows = async (request: KibanaRequest) => {
    if (!server.workflowsExtensions) {
      throw new Error('Workflows are not available');
    }
    return (await server.workflowsExtensions.getClient(request)).managedWorkflows;
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
    const serviceAccountId = await requireDetectionEngineAccountId({ core: server.core, spaceId });
    const client = await getManagedWorkflows(request);
    await Promise.all([
      client.install(
        SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
        NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID,
        {
          spaceId,
          workflowIdSuffix: spaceId,
          values: {
            serviceAccountId,
            detectionIntervalMinutes: config.detectionIntervalMinutes,
            detectionBucketIntervalMinutes: config.detectionBucketIntervalMinutes,
            detectionLookbackMinutes: config.detectionLookbackMinutes,
            targetCoverageMinutes: config.targetCoverageMinutes,
          },
        }
      ),
      client.install(
        SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
        NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID,
        {
          spaceId,
          workflowIdSuffix: spaceId,
          values: {
            serviceAccountId,
            reviewIntervalMinutes: config.reviewIntervalMinutes,
            discoveryBatchSize: config.discoveryBatchSize,
            maxReviewPasses: config.maxReviewPasses,
            flakyRuleDetectionThreshold: config.flakyRuleDetectionThreshold,
            flakyRuleProbeAfterMinutes: config.flakyRuleProbeAfterMinutes,
            flakyRuleExemptSeverityScore: config.flakyRuleExemptSeverityScore,
          },
        }
      ),
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

  const uninstallScheduledWorkflows = async ({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }) => {
    const client = await getManagedWorkflows(request);
    await Promise.all(
      SCHEDULED_DISCOVERY_WORKFLOW_IDS.map((id) =>
        client.uninstall(SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER, id, {
          spaceId,
          workflowIdSuffix: spaceId,
        })
      )
    );
  };

  return {
    async ensureWorkflow({ enabled, request, spaceId, config }) {
      if (enabled) {
        await installOrUpdate({ request, spaceId, config });
        await setAllEnabled({ enabled: true, request, spaceId });
        log.info(`Enabled scheduled Significant Events discovery workflows in space ${spaceId}`);
        return;
      }

      await setAllEnabled({ enabled: false, request, spaceId });
      await cancelRunningScheduledExecutions({ request, spaceId });
      await uninstallScheduledWorkflows({ request, spaceId });
      log.info(
        `Disabled and uninstalled scheduled Significant Events discovery workflows in space ${spaceId}`
      );
    },

    async rebind({ request, spaceId, config }) {
      const installed = await managementApi
        .getClient(request)
        .getWorkflow(
          getWorkflowDocumentId(NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID, spaceId),
          spaceId
        );
      if (installed) {
        await installOrUpdate({ request, spaceId, config });
      }
    },
  };
};
