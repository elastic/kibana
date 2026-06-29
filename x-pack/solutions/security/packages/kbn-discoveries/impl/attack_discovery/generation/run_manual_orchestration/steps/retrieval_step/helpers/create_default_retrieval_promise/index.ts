/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type { IEventLogger } from '@kbn/event-log-plugin/server';

import {
  invokeAlertRetrievalWorkflow,
  type AlertRetrievalResult,
  type WorkflowsManagementApi,
} from '../../../../../invoke_alert_retrieval_workflow';
import type { AttackDiscoverySource } from '../../../../../../persistence/event_logging';
import type { AlertRetrievalQueryMode, ParsedApiConfig } from '../../../../../types';

/**
 * Builds the built-in default alert retrieval promise (Toggle 2). When the
 * toggle is off (`defaultRetrievalEnabled === false`) the default retrieval is
 * skipped and `null` is resolved. When on, the default alert retrieval workflow
 * runs in the selected query mode (`custom_query` DSL, or `esql` with the
 * supplied `esqlQuery`).
 *
 * The skill's additional retrieval is no longer a retrieval-phase concern — it
 * is a behavior of the generation-phase gate (`runGatePhase`), so this helper no
 * longer handles a `skill` mode.
 */
export const createDefaultRetrievalPromise = ({
  alertsIndexPattern,
  anonymizationFields,
  apiConfig,
  authenticatedUser,
  alertRetrievalMode,
  defaultAlertRetrievalWorkflowId,
  defaultRetrievalEnabled,
  end,
  esqlQuery,
  eventLogger,
  eventLogIndex,
  executionUuid,
  filter,
  logger,
  maxWaitMs,
  request,
  size,
  source,
  spaceId,
  start,
  workflowsManagementApi,
}: {
  alertsIndexPattern: string;
  anonymizationFields: AnonymizationFieldResponse[];
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  /** Query mode for the built-in default retrieval workflow (Toggle 2 sub-field). */
  alertRetrievalMode: AlertRetrievalQueryMode;
  defaultAlertRetrievalWorkflowId: string;
  /** Toggle 2: whether the built-in default retrieval workflow runs. */
  defaultRetrievalEnabled: boolean;
  end?: string;
  esqlQuery?: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  filter?: Record<string, unknown>;
  logger: Logger;
  /**
   * Maximum time to wait for the retrieval workflow to complete, in
   * milliseconds. Threaded from the orchestration's remaining pipeline budget
   * down to `pollForWorkflowCompletion` so the consumer-side poll never gives
   * up before the workflow's own step timeout.
   */
  maxWaitMs?: number;
  request: KibanaRequest;
  size?: number;
  source?: AttackDiscoverySource;
  spaceId: string;
  start?: string;
  workflowsManagementApi: WorkflowsManagementApi;
}): Promise<AlertRetrievalResult | null> => {
  if (!defaultRetrievalEnabled) {
    return Promise.resolve(null);
  }

  return invokeAlertRetrievalWorkflow({
    alertsIndexPattern,
    anonymizationFields,
    apiConfig,
    authenticatedUser,
    end,
    esqlQuery: alertRetrievalMode === 'esql' ? esqlQuery : undefined,
    eventLogger,
    eventLogIndex,
    executionUuid,
    filter,
    logger,
    ...(maxWaitMs != null ? { maxWaitMs } : {}),
    request,
    size,
    source,
    spaceId,
    start,
    workflowId: defaultAlertRetrievalWorkflowId,
    workflowsManagementApi,
  });
};
