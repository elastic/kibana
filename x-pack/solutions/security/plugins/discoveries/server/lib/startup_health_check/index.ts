/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export interface StartupHealthCheckParams {
  expectedWorkflowIds: readonly string[];
  failedWorkflowIds: string[];
  logger: Logger;
  workflowsManagementApiAvailable: boolean;
}

/**
 * Logs a startup health check summary so operators can quickly verify
 * whether the discoveries plugin initialized correctly.
 *
 * Logs INFO when all checks pass, WARN when any issues are detected.
 */
export const logStartupHealthCheck = ({
  expectedWorkflowIds,
  failedWorkflowIds,
  logger,
  workflowsManagementApiAvailable,
}: StartupHealthCheckParams): void => {
  const installedCount = expectedWorkflowIds.length - failedWorkflowIds.length;
  const totalCount = expectedWorkflowIds.length;

  const issues: string[] = [
    ...(failedWorkflowIds.length > 0
      ? [
          `${failedWorkflowIds.length} managed workflow(s) not installed: ${failedWorkflowIds.join(
            ', '
          )}`,
        ]
      : []),
    ...(!workflowsManagementApiAvailable ? ['WorkflowsManagement API is not available'] : []),
  ];

  if (issues.length === 0) {
    logger.info(`AD 2.0 managed workflows installed: ${installedCount}/${totalCount}`);
  } else {
    logger.warn(`AD 2.0 managed workflows: ${issues.join('; ')}`);
  }
};
