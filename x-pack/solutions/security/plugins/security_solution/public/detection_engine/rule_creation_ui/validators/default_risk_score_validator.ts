/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MIN_RISK_SCORE = 0;
export const MAX_RISK_SCORE = 100;

export function defaultRiskScoreValidator(defaultRiskScore: unknown, path: string) {
  return isDefaultRiskScoreWithinRange(defaultRiskScore)
    ? undefined
    : {
        path,
        message: i18n.translate(
          'xpack.securitySolution.ruleManagement.ruleCreation.validation.defaultRiskScoreOutOfRangeValidationError',
          {
            values: { min: MIN_RISK_SCORE, max: MAX_RISK_SCORE },
            defaultMessage: 'Risk score must be between {min} and {max}.',
          }
        ),
      };
}

function isDefaultRiskScoreWithinRange(value: unknown) {
  return typeof value === 'number' && value >= MIN_RISK_SCORE && value <= MAX_RISK_SCORE;
}
