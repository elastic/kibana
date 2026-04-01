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
  type AnonymizedAlert,
  type WorkflowsManagementApi,
} from '../../../../../invoke_alert_retrieval_workflow';
import type { DefaultAlertRetrievalMode, ParsedApiConfig } from '../../../../../types';

const buildProvidedResult = ({
  apiConfig,
  providedContext,
}: {
  apiConfig: ParsedApiConfig;
  providedContext: string[];
}): AlertRetrievalResult => {
  const anonymizedAlerts: AnonymizedAlert[] = providedContext.map((content) => ({
    metadata: {},
    page_content: content,
  }));

  return {
    alerts: providedContext,
    alertsContextCount: providedContext.length,
    anonymizedAlerts,
    apiConfig,
    connectorName: '',
    replacements: {},
    workflowExecutions: [],
    workflowId: 'provided',
    workflowRunId: 'provided',
  };
};

export const createLegacyRetrievalPromise = ({
  alertsIndexPattern,
  anonymizationFields,
  apiConfig,
  authenticatedUser,
  defaultAlertRetrievalMode,
  defaultAlertRetrievalWorkflowId,
  end,
  esqlQuery,
  eventLogger,
  eventLogIndex,
  executionUuid,
  filter,
  logger,
  providedContext,
  request,
  size,
  spaceId,
  start,
  workflowsManagementApi,
}: {
  alertsIndexPattern: string;
  anonymizationFields: AnonymizationFieldResponse[];
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  defaultAlertRetrievalMode: DefaultAlertRetrievalMode;
  defaultAlertRetrievalWorkflowId: string;
  end?: string;
  esqlQuery?: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  filter?: Record<string, unknown>;
  logger: Logger;
  providedContext?: string[];
  request: KibanaRequest;
  size?: number;
  spaceId: string;
  start?: string;
  workflowsManagementApi: WorkflowsManagementApi;
}): Promise<AlertRetrievalResult | null> => {
  if (defaultAlertRetrievalMode === 'disabled') {
    return Promise.resolve(null);
  }

  if (defaultAlertRetrievalMode === 'provided') {
    return Promise.resolve(
      buildProvidedResult({ apiConfig, providedContext: providedContext ?? [] })
    );
  }

  return invokeAlertRetrievalWorkflow({
    alertsIndexPattern,
    anonymizationFields,
    apiConfig,
    authenticatedUser,
    end,
    esqlQuery: defaultAlertRetrievalMode === 'esql' ? esqlQuery : undefined,
    eventLogger,
    eventLogIndex,
    executionUuid,
    filter,
    logger,
    request,
    size,
    spaceId,
    start,
    workflowId: defaultAlertRetrievalWorkflowId,
    workflowsManagementApi,
  });
};
