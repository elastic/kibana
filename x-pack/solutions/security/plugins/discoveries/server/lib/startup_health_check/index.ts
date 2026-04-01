/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export interface StartupHealthCheckParams {
  failedStepIds: string[];
  logger: Logger;
  registeredStepCount: number;
  workflowsManagementApiAvailable: boolean;
}

/**
 * Logs a startup health check summary so operators can quickly verify
 * whether the discoveries plugin initialized correctly.
 *
 * Logs INFO when all checks pass, WARN when any issues are detected.
 */
export const logStartupHealthCheck = ({
  failedStepIds,
  logger,
  registeredStepCount,
  workflowsManagementApiAvailable,
}: StartupHealthCheckParams): void => {
  const issues: string[] = [
    ...(failedStepIds.length > 0
      ? [`${failedStepIds.length} workflow step(s) failed to register: ${failedStepIds.join(', ')}`]
      : []),
    ...(!workflowsManagementApiAvailable ? ['WorkflowsManagement API is not available'] : []),
  ];

  if (issues.length === 0) {
    logger.info(
      `Startup health check passed: ${registeredStepCount} workflow step(s) registered, WorkflowsManagement API available`
    );
  } else {
    logger.warn(`Startup health check found issues: ${issues.join('; ')}`);
  }
};
