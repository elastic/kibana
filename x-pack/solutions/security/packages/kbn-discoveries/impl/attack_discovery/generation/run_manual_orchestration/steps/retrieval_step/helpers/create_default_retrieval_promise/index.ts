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
import type { AlertRetrievalMode, ParsedApiConfig } from '../../../../../types';

export const createLegacyRetrievalPromise = ({
  alertsIndexPattern,
  anonymizationFields,
  apiConfig,
  authenticatedUser,
  alertRetrievalMode,
  defaultAlertRetrievalWorkflowId,
  end,
  esqlQuery,
  eventLogger,
  eventLogIndex,
  executionUuid,
  filter,
  logger,
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
  alertRetrievalMode: AlertRetrievalMode;
  defaultAlertRetrievalWorkflowId: string;
  end?: string;
  esqlQuery?: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  filter?: Record<string, unknown>;
  logger: Logger;
  request: KibanaRequest;
  size?: number;
  source?: AttackDiscoverySource;
  spaceId: string;
  start?: string;
  workflowsManagementApi: WorkflowsManagementApi;
}): Promise<AlertRetrievalResult | null> => {
  if (alertRetrievalMode === 'custom_only' || alertRetrievalMode === 'provided') {
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
    request,
    size,
    source,
    spaceId,
    start,
    workflowId: defaultAlertRetrievalWorkflowId,
    workflowsManagementApi,
  });
};
