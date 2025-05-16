/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERT_EVALUATION_UNIT_TYPE = {
  DURATION: 'DURATION',
  PERCENT: 'PERCENT',
  NUMBER: 'NUMBER',
} as const;

type ObjectValues<T> = T[keyof T];
type AlertEvaluationUnitType = ObjectValues<typeof ALERT_EVALUATION_UNIT_TYPE>;

export const getAlertEvaluationUnitTypeByRuleTypeId = (
  ruleTypeId: string
): AlertEvaluationUnitType => {
  switch (ruleTypeId) {
    case 'apm.transaction_duration':
      return ALERT_EVALUATION_UNIT_TYPE.DURATION;
    case 'apm.transaction_error_rate':
      return ALERT_EVALUATION_UNIT_TYPE.PERCENT;
    default:
      return ALERT_EVALUATION_UNIT_TYPE.NUMBER;
  }
};
