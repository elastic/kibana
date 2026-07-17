/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { CustomWorkflowAlertResult } from '../../../../../extract_custom_workflow_result';

/**
 * Resolves the settled result from the custom alert retrieval workflows.
 *
 * If the custom workflows promise rejected, the error is re-thrown so the
 * pipeline does not proceed to generation with incomplete alert data.
 */
export const resolveCustomSettledResults = ({
  customSettled,
  logger,
}: {
  customSettled: PromiseSettledResult<CustomWorkflowAlertResult[]>;
  logger: Logger;
}): CustomWorkflowAlertResult[] => {
  if (customSettled.status === 'fulfilled') {
    return customSettled.value;
  }

  const errorMessage =
    customSettled.reason instanceof Error
      ? customSettled.reason.message
      : String(customSettled.reason);

  logger.error(`Custom alert retrieval workflows failed: ${errorMessage}`);

  throw customSettled.reason;
};
