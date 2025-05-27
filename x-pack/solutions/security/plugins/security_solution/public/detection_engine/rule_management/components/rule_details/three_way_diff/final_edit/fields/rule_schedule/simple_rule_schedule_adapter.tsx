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

export function SimpleRuleScheduleAdapter(): JSX.Element {
  return (
    <>
      <UseField
        path="interval"
        config={INTERVAL_FIELD_CONFIG}
        component={ScheduleItemField}
        componentProps={INTERVAL_COMPONENT_PROPS}
      />
      <UseField
        path="lookback"
        config={LOOK_BACK_FIELD_CONFIG}
        component={ScheduleItemField}
        componentProps={LOOKBACK_COMPONENT_PROPS}
      />
    </>
  );
}

const INTERVAL_COMPONENT_PROPS = {
  minValue: 1,
  dataTestSubj: 'intervalFormRow',
};

const LOOKBACK_COMPONENT_PROPS = {
  minValue: 0,
  dataTestSubj: 'lookbackFormRow',
};

const INTERVAL_FIELD_CONFIG: FieldConfig<string> = {
  label: i18n.INTERVAL_FIELD_LABEL,
  helpText: i18n.INTERVAL_FIELD_HELP_TEXT,
};

const LOOK_BACK_FIELD_CONFIG: FieldConfig<string> = {
  label: i18n.LOOK_BACK_FIELD_LABEL,
  helpText: i18n.LOOK_BACK_FIELD_HELP_TEXT,
};
