/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HISTORY_WINDOW_START_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.historyWindowSizeLabel',
  {
    defaultMessage: 'History Window Size',
  }
);

export const HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepScheduleRule.historyWindowSizeHelpText',
  {
    defaultMessage: "New terms rules only alert if terms don't appear in historical data.",
  }
);

export const MUST_BE_POSITIVE_INTEGER_VALIDATION_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.validations.stepDefineRule.historyWindowSize.errNumber',
  {
    defaultMessage: 'History window size must be a positive number.',
  }
);

export const MUST_BE_GREATER_THAN_ZERO_VALIDATION_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.validations.stepDefineRule.historyWindowSize.errMin',
  {
    defaultMessage: 'History window size must be greater than 0.',
  }
);
