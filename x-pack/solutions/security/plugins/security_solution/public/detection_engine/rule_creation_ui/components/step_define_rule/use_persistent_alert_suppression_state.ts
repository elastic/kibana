/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { isThresholdRule } from '../../../../../common/detection_engine/utils';
import type { FormHook } from '../../../../shared_imports';
import { useFormData } from '../../../../shared_imports';
import { THRESHOLD_ALERT_SUPPRESSION_ENABLED } from '../../../rule_creation/components/threshold_alert_suppression_edit';
import {
  ALERT_SUPPRESSION_DURATION_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME,
  ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
  ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME,
} from '../../../rule_creation/components/alert_suppression_edit';
import {
  AlertSuppressionDurationType,
  type DefineStepRule,
} from '../../../../detections/pages/detection_engine/rules/types';

interface UsePersistentAlertSuppressionStateParams {
  form: FormHook<DefineStepRule>;
}

export function usePersistentAlertSuppressionState({
  form,
}: UsePersistentAlertSuppressionStateParams): void {
  const [
    {
      ruleType,
      [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: thresholdAlertSuppressionEnabled,
      [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: suppressionFields,
      [ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME]: suppressionDurationType,
      [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: suppressionDuration,
      [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]: suppressionMissingFieldsStrategy,
    },
  ] = useFormData({
    form,
    watch: [
      'ruleType',
      THRESHOLD_ALERT_SUPPRESSION_ENABLED,
      ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
      ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME,
      `${ALERT_SUPPRESSION_DURATION_FIELD_NAME}.${ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME}`,
      `${ALERT_SUPPRESSION_DURATION_FIELD_NAME}.${ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME}`,
      ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME,
    ],
  });
  const previousRuleType = usePrevious(ruleType);

  useEffect(() => {
    if (!ruleType || ruleType === previousRuleType) {
      return;
    }

    form.updateFieldValues({
      [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: thresholdAlertSuppressionEnabled,
      [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: suppressionFields,
      ...(isThresholdRule(ruleType)
        ? {
            [ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME]:
              AlertSuppressionDurationType.PerTimePeriod,
          }
        : { [ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME]: suppressionDurationType }),
      [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: suppressionDuration,
      [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]: suppressionMissingFieldsStrategy,
    });
  }, [
    form,
    ruleType,
    previousRuleType,
    thresholdAlertSuppressionEnabled,
    suppressionFields,
    suppressionDurationType,
    suppressionDuration,
    suppressionMissingFieldsStrategy,
  ]);
}
