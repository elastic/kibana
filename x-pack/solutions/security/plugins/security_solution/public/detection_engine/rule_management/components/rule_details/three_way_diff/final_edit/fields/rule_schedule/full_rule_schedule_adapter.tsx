/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { FieldConfig } from '../../../../../../../../shared_imports';
import { UseField } from '../../../../../../../../shared_imports';
import { ScheduleItemField } from '../../../../../../../rule_creation/components/schedule_item_field';
import * as i18n from './translations';
import { dateMathValidator } from './validators/date_math_validator';

export function FullRuleScheduleAdapter(): JSX.Element {
  return (
    <>
      <UseField
        path="interval"
        config={INTERVAL_FIELD_CONFIG}
        component={ScheduleItemField}
        componentProps={INTERVAL_COMPONENT_PROPS}
      />
      <UseField path="from" config={FROM_FIELD_CONFIG} component={TextField} />
      <UseField path="to" config={TO_FIELD_CONFIG} component={TextField} />
    </>
  );
}

const INTERVAL_COMPONENT_PROPS = {
  minValue: 1,
};

const INTERVAL_FIELD_CONFIG: FieldConfig<string> = {
  label: i18n.INTERVAL_FIELD_LABEL,
  helpText: i18n.INTERVAL_FIELD_HELP_TEXT,
};

const FROM_FIELD_CONFIG: FieldConfig<string> = {
  label: i18n.FROM_FIELD_LABEL,
  helpText: i18n.DATE_MATH_HELP_TEXT,
  validations: [
    {
      validator: dateMathValidator,
    },
  ],
};

const TO_FIELD_CONFIG: FieldConfig<string> = {
  label: i18n.TO_FIELD_LABEL,
  helpText: i18n.DATE_MATH_HELP_TEXT,
  validations: [
    {
      validator: dateMathValidator,
    },
  ],
};
