/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const THREAT_MATCH_INDEX_FIELD_VALIDATION_REQUIRED_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.ruleFields.threatMatchIndex.validation.requiredError',
  {
    defaultMessage: 'A minimum of one index pattern is required.',
  }
);

export const THREAT_MATCH_INDEX_FIELD_VALIDATION_FORBIDDEN_PATTERN_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.ruleFields.threatMatchIndexForbiddenError',
  {
    defaultMessage: 'The index pattern cannot be "*". Please choose a more specific index pattern.',
  }
);
