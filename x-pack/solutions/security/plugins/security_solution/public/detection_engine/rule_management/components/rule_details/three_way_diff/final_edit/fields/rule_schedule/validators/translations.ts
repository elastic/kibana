/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INVALID_DATE_MATH = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.validation.dateMath.invalid',
  {
    defaultMessage: 'Date math is invalid. Valid examples: "now", "now-3h", "now+2m".',
  }
);
