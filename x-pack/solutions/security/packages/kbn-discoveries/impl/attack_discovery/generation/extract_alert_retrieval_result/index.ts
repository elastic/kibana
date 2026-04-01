/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';

import { AttackDiscoveryError } from '../../../lib/errors/attack_discovery_error';
import type { ParsedApiConfig } from '../types';

// Types from invoke_alert_retrieval_workflow (real impl in PR 4)
interface AnonymizedAlert {
  id?: string;
  metadata: Record<string, never>;
  page_content: string;
}

export interface ExtractedAlertRetrievalResult {
  alerts: string[];
  alertsContextCount: number;
  anonymizedAlerts: AnonymizedAlert[];
  apiConfig: ParsedApiConfig;
  connectorName: string;
  replacements: Record<string, string>;
}

const parseApiConfig = ({
  apiConfig,
  apiConfigOutput,
}: {
  apiConfig: ParsedApiConfig;
  apiConfigOutput: unknown;
}): ParsedApiConfig => {
  if (typeof apiConfigOutput === 'string') {
    try {
      return JSON.parse(apiConfigOutput) as ParsedApiConfig;
    } catch {
      return apiConfig;
    }
  }

  if (apiConfigOutput && typeof apiConfigOutput === 'object') {
    return apiConfigOutput as ParsedApiConfig;
  }

  return apiConfig;
};

export const extractAlertRetrievalResult = ({
  apiConfig,
  execution,
}: {
  apiConfig: ParsedApiConfig;
  execution: WorkflowExecutionDto;
}): ExtractedAlertRetrievalResult => {
  if (execution.status === 'failed') {
    const errorMessage = execution.error?.message ?? 'Unknown error';
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message: `Alert retrieval workflow failed: ${errorMessage}`,
      workflowId: execution.workflowId,
    });
  }

  if (execution.status === 'cancelled') {
    throw new AttackDiscoveryError({
      errorCategory: 'concurrent_conflict',
      message:
        'Alert retrieval workflow was cancelled. This may indicate a concurrent execution or manual cancellation. Retry generation.',
      workflowId: execution.workflowId,
    });
  }

  if (execution.status === 'timed_out') {
    throw new AttackDiscoveryError({
      errorCategory: 'timeout',
      message:
        'Alert retrieval workflow timed out. Consider increasing the workflow timeout or reducing the alert count.',
      workflowId: execution.workflowId,
    });
  }

  const alertRetrievalStep = execution.stepExecutions.find(
    (step) => step.stepType === 'attack-discovery.defaultAlertRetrieval'
  );

  if (!alertRetrievalStep) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message: 'Alert retrieval step not found in workflow execution',
      workflowId: execution.workflowId,
    });
  }

  if (!alertRetrievalStep.output) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message:
        'Alert retrieval step completed but returned no alerts. Check the time range, filter, and alerts index configuration.',
      workflowId: execution.workflowId,
    });
  }

  const output = alertRetrievalStep.output as {
    alerts?: string[];
    alerts_context_count?: number;
    anonymized_alerts?: AnonymizedAlert[];
    api_config?: unknown;
    connector_name?: string;
    replacements?: Record<string, string>;
  };

  const parsedApiConfig = parseApiConfig({
    apiConfig,
    apiConfigOutput: output.api_config,
  });

  return {
    alerts: output.alerts ?? [],
    alertsContextCount: output.alerts_context_count ?? 0,
    anonymizedAlerts: output.anonymized_alerts ?? [],
    apiConfig: parsedApiConfig,
    connectorName: output.connector_name ?? apiConfig.connector_id,
    replacements: output.replacements ?? {},
  };
};
