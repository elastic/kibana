/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ALERT_SUPPRESSION_DURATION_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME,
  ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
  ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME,
  ALERT_SUPPRESSION_DEFAULT_DURATION,
} from '../../../../../../../rule_creation/components/alert_suppression_edit';
import { AlertSuppressionDurationType } from '../../../../../../../../detections/pages/detection_engine/rules/types';
import { type FormData } from '../../../../../../../../shared_imports';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../../../../../common/detection_engine/constants';
import { type AlertSuppression } from '../../../../../../../../../common/api/detection_engine';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { AlertSuppressionEditAdapter } from './suppression_edit_adapter';
import { alertSuppressionFormSchema, type AlertSuppressionFormData } from './form_schema';

export function AlertSuppressionEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={AlertSuppressionEditAdapter}
      ruleFieldFormSchema={alertSuppressionFormSchema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

function deserializer(defaultValue: FormData): AlertSuppressionFormData {
  const alertSuppression = defaultValue.alert_suppression as AlertSuppression | undefined;

  return {
    [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: alertSuppression?.group_by ?? [],
    [ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME]: alertSuppression?.duration
      ? AlertSuppressionDurationType.PerTimePeriod
      : AlertSuppressionDurationType.PerRuleExecution,
    [ALERT_SUPPRESSION_DURATION_FIELD_NAME]:
      alertSuppression?.duration ?? ALERT_SUPPRESSION_DEFAULT_DURATION,
    [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]:
      alertSuppression?.missing_fields_strategy ?? DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
  };
}

function serializer(formData: FormData): { alert_suppression?: AlertSuppression } {
  const alertSuppressionFormData = formData as AlertSuppressionFormData;

  if (alertSuppressionFormData[ALERT_SUPPRESSION_FIELDS_FIELD_NAME].length === 0) {
    return {};
  }

  return {
    alert_suppression: {
      group_by: alertSuppressionFormData[ALERT_SUPPRESSION_FIELDS_FIELD_NAME],
      duration:
        alertSuppressionFormData[ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME] ===
        AlertSuppressionDurationType.PerTimePeriod
          ? alertSuppressionFormData[ALERT_SUPPRESSION_DURATION_FIELD_NAME]
          : undefined,
      missing_fields_strategy:
        alertSuppressionFormData[ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME] ||
        DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
    },
  };
}
