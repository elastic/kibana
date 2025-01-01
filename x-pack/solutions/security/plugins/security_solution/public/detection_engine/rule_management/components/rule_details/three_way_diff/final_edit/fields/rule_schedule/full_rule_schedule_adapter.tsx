/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FieldConfig } from '../../../../../../../../shared_imports';
import { UseField } from '../../../../../../../../shared_imports';
import { ScheduleItemField } from '../../../../../../../rule_creation/components/schedule_item_field';
import * as i18n from './translations';

export interface FullRuleSchedule {
  interval: string;
  fromOffset: string;
  toOffset: string;
}

export function FullRuleScheduleAdapter(): JSX.Element {
  return (
    <>
      <UseField
        path="interval"
        config={INTERVAL_FIELD_CONFIG}
        component={ScheduleItemField}
        componentProps={INTERVAL_COMPONENT_PROPS}
      />
      <UseField
        path="fromOffset"
        config={FROM_OFFSET_FIELD_CONFIG}
        component={ScheduleItemField}
        componentProps={OFFSET_COMPONENT_PROPS}
      />
      <UseField
        path="toOffset"
        config={TO_OFFSET_FIELD_CONFIG}
        component={ScheduleItemField}
        componentProps={OFFSET_COMPONENT_PROPS}
      />
    </>
  );
}

const INTERVAL_COMPONENT_PROPS = {
  minValue: 1,
};

const OFFSET_COMPONENT_PROPS = {
  maxValue: 0,
};

const INTERVAL_FIELD_CONFIG: FieldConfig<string> = {
  label: i18n.INTERVAL_FIELD_LABEL,
  helpText: i18n.INTERVAL_FIELD_HELP_TEXT,
};

const FROM_OFFSET_FIELD_CONFIG: FieldConfig<string> = {
  label: i18n.FROM_OFFSET_FIELD_LABEL,
  helpText: i18n.FROM_OFFSET_FIELD_HELP_TEXT,
};

const TO_OFFSET_FIELD_CONFIG: FieldConfig<string> = {
  label: i18n.TO_OFFSET_FIELD_LABEL,
  helpText: i18n.TO_OFFSET_FIELD_HELP_TEXT,
};
