/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TASK_MANAGER_UNAVAILABLE_ERROR = i18n.translate(
  'xpack.securitySolution.api.riskEngine.taskManagerUnavailable',
  {
    defaultMessage:
      'Task Manager is unavailable, but is required by the risk engine. Please enable the taskManager plugin and try again.',
  }
);

export const missingEntityIndexPrivilegesError = (index: string) =>
  i18n.translate('xpack.securitySolution.api.riskEngine.missingEntityIndexPrivilegesErrorMessage', {
    defaultMessage: 'Missing read and write privileges for entity index "{index}".',
    values: { index },
  });

export const MISSING_RISK_SCORE_DELETE_PRIVILEGES_ERROR = i18n.translate(
  'xpack.securitySolution.api.riskEngine.missingRiskScoreDeletePrivilegesErrorMessage',
  {
    defaultMessage:
      'Missing delete_index privileges for the risk score data stream and lookup index.',
  }
);

export const RISK_SCORE_CLEANUP_IN_PROGRESS_ERROR = i18n.translate(
  'xpack.securitySolution.api.riskEngine.cleanupInProgressErrorMessage',
  {
    defaultMessage:
      'Risk scoring is in progress. Wait for the current run to finish and try the cleanup again.',
  }
);

export const ENTITY_ANALYTICS_V2_MODE_API_ERROR = i18n.translate(
  'xpack.securitySolution.api.riskEngine.entityAnalyticsV2ModeApiError',
  {
    defaultMessage:
      'This API is not available when Entity Store V2 is enabled. Use the Entity Store APIs instead.',
  }
);
