/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { DefaultWorkflowIds } from '../types';

export interface PreExecutionIssue {
  check: string;
  message: string;
  severity: 'critical' | 'warning';
}

export interface PreExecutionValidationResult {
  issues: PreExecutionIssue[];
  valid: boolean;
}

export interface ValidatePreExecutionParams {
  alertsIndexPattern: string;
  connectorId: string;
  defaultWorkflowIds: DefaultWorkflowIds | null;
  esClient: ElasticsearchClient;
  logger: Logger;
  resolveConnector: () => Promise<unknown>;
  workflowsManagementApi?: unknown;
}

const checkWorkflowsManagementApi = (workflowsManagementApi: unknown): PreExecutionIssue | null => {
  if (workflowsManagementApi == null) {
    return {
      check: 'workflowsManagementApi',
      message: 'WorkflowsManagement API is not available; cannot execute workflows',
      severity: 'critical',
    };
  }
  return null;
};

const checkDefaultWorkflowIds = (
  defaultWorkflowIds: DefaultWorkflowIds | null
): PreExecutionIssue | null => {
  if (defaultWorkflowIds == null) {
    return {
      check: 'defaultWorkflowIds',
      message: 'Default workflows could not be resolved; cannot execute workflows',
      severity: 'critical',
    };
  }
  return null;
};

const checkAlertsIndex = async (
  esClient: ElasticsearchClient,
  alertsIndexPattern: string
): Promise<PreExecutionIssue | null> => {
  try {
    const indexExists = await esClient.indices.exists({ index: alertsIndexPattern });

    if (!indexExists) {
      return {
        check: 'alertsIndex',
        message: `Alerts index '${alertsIndexPattern}' does not exist`,
        severity: 'warning',
      };
    }

    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      check: 'alertsIndex',
      message: `Failed to check alerts index '${alertsIndexPattern}': ${message}`,
      severity: 'warning',
    };
  }
};

const checkConnectorAccessibility = async (
  connectorId: string,
  resolveConnector: () => Promise<unknown>
): Promise<PreExecutionIssue | null> => {
  if (connectorId === '') {
    return {
      check: 'connectorAccessibility',
      message: 'Connector ID is empty',
      severity: 'warning',
    };
  }

  try {
    await resolveConnector();
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      check: 'connectorAccessibility',
      message: `Connector '${connectorId}' is not accessible: ${message}`,
      severity: 'warning',
    };
  }
};

/**
 * Validates all preconditions required for the generation workflow pipeline.
 *
 * Runs all checks concurrently, collects issues, and logs a structured summary.
 * Returns a result indicating whether execution should proceed:
 * - `valid: true` means no critical issues (warnings are logged but non-blocking)
 * - `valid: false` means at least one critical issue was found
 */
export const validatePreExecution = async ({
  alertsIndexPattern,
  connectorId,
  defaultWorkflowIds,
  esClient,
  logger,
  resolveConnector,
  workflowsManagementApi,
}: ValidatePreExecutionParams): Promise<PreExecutionValidationResult> => {
  const [alertsIndexIssue, connectorIssue] = await Promise.all([
    checkAlertsIndex(esClient, alertsIndexPattern),
    checkConnectorAccessibility(connectorId, resolveConnector),
  ]);

  const issues: PreExecutionIssue[] = [
    checkWorkflowsManagementApi(workflowsManagementApi),
    checkDefaultWorkflowIds(defaultWorkflowIds),
    alertsIndexIssue,
    connectorIssue,
  ].filter((issue): issue is PreExecutionIssue => issue != null);

  if (issues.length > 0) {
    const criticalIssues = issues.filter((i) => i.severity === 'critical');
    const warnings = issues.filter((i) => i.severity === 'warning');

    if (criticalIssues.length > 0) {
      logger.warn(
        `Pre-execution validation found ${criticalIssues.length} critical issue(s): ${criticalIssues
          .map((i) => i.message)
          .join('; ')}`
      );
    }

    if (warnings.length > 0) {
      logger.warn(
        `Pre-execution validation found ${warnings.length} warning(s): ${warnings
          .map((i) => i.message)
          .join('; ')}`
      );
    }
  } else {
    logger.debug(() => 'Pre-execution validation passed: all checks OK');
  }

  const hasCriticalIssues = issues.some((i) => i.severity === 'critical');

  return {
    issues,
    valid: !hasCriticalIssues,
  };
};
