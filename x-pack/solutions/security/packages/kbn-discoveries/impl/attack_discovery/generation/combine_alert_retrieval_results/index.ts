/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertRetrievalResult } from '../invoke_alert_retrieval_workflow';
import type { CustomWorkflowAlertResult } from '../extract_custom_workflow_result';
import type { ParsedApiConfig, WorkflowExecutionTracking } from '../types';

/**
 * Combines results from legacy alert retrieval and custom alert retrieval workflows
 * into a single `AlertRetrievalResult` suitable for the generation step.
 *
 * Alert strings from all sources are concatenated. Custom workflow alerts are
 * raw (non-anonymized) JSON strings, while legacy alerts are anonymized.
 * The generation step processes both formats transparently.
 *
 * When only custom workflow results are present (legacy disabled), a synthetic
 * `AlertRetrievalResult` is constructed with empty anonymization fields.
 */
export const combineAlertRetrievalResults = ({
  apiConfig,
  customResults,
  legacyResult,
}: {
  apiConfig: ParsedApiConfig;
  customResults: CustomWorkflowAlertResult[];
  legacyResult: AlertRetrievalResult | null;
}): AlertRetrievalResult => {
  // Collect all alerts from custom workflows
  const customAlerts = customResults.flatMap((result) => result.alerts);

  // Collect workflow execution references from custom results
  const customWorkflowExecutions: WorkflowExecutionTracking[] = customResults.map((result) => ({
    workflowId: result.workflowId,
    workflowRunId: result.workflowRunId,
  }));

  // Combine workflow executions from all sources
  const allWorkflowExecutions: WorkflowExecutionTracking[] = [
    ...(legacyResult?.workflowExecutions ?? []),
    ...customWorkflowExecutions,
  ];

  // If we have a legacy result, merge custom alerts into it
  if (legacyResult != null) {
    return {
      ...legacyResult,
      alerts: [...legacyResult.alerts, ...customAlerts],
      alertsContextCount: legacyResult.alertsContextCount + customAlerts.length,
      workflowExecutions: allWorkflowExecutions,
    };
  }

  // No legacy result: build a synthetic result from custom workflow alerts only
  return {
    alerts: customAlerts,
    alertsContextCount: customAlerts.length,
    anonymizedAlerts: [],
    apiConfig,
    connectorName: apiConfig.connector_id,
    replacements: {},
    workflowExecutions: allWorkflowExecutions,
    workflowId: customResults[0]?.workflowId ?? 'custom',
    workflowRunId: customResults[0]?.workflowRunId ?? 'custom',
  };
};
