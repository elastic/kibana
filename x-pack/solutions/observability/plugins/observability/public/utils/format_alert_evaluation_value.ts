/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { asInteger, asMillisecondDuration, asPercent } from '../../common/utils/formatters';
import {
  ALERT_EVALUATION_UNIT_TYPE,
  getAlertEvaluationUnitTypeByRuleTypeId,
} from './get_alert_evaluation_unit_type_by_rule_type_id';

export const formatAlertEvaluationValue = (ruleTypeId?: string, evaluationValue?: number) => {
  if (evaluationValue == null || !ruleTypeId) return '-';

  const unitType = getAlertEvaluationUnitTypeByRuleTypeId(ruleTypeId);

  switch (unitType) {
    case ALERT_EVALUATION_UNIT_TYPE.DURATION:
      return asMillisecondDuration(evaluationValue);
    case ALERT_EVALUATION_UNIT_TYPE.PERCENT:
      return asPercent(evaluationValue, 100);
    case ALERT_EVALUATION_UNIT_TYPE.ERROR_COUNT:
      return i18n.translate('xpack.observability.alertEvaluation.errorCountValue', {
        defaultMessage: '{formattedValue} {value, plural, one {error} other {errors}}',
        values: { value: evaluationValue, formattedValue: asInteger(evaluationValue) },
      });
    default:
      return evaluationValue;
  }
};
