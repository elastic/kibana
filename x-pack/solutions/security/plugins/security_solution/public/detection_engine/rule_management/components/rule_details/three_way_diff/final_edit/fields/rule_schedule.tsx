/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DEFAULT_RULE_EXECUTION_LOOKBACK } from '../../../../../../../../common/detection_engine/constants';
import { type FormSchema, type FormData, UseField } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_schedule_rule/schema';
import type { RuleSchedule } from '../../../../../../../../common/api/detection_engine';
import { ScheduleItemField } from '../../../../../../rule_creation/components/schedule_item_field';
import { safeHumanizeLookbackDuration } from '../../utils/safe_humanize_lookback';

export const ruleScheduleSchema = {
  interval: schema.interval,
  from: schema.from,
} as FormSchema<{
  interval: string;
  from: string;
}>;

const componentProps = {
  minimumValue: 1,
};

export function RuleScheduleEdit(): JSX.Element {
  return (
    <>
      <UseField path="interval" component={ScheduleItemField} componentProps={componentProps} />
      <UseField path="from" component={ScheduleItemField} componentProps={componentProps} />
    </>
  );
}

export function ruleScheduleDeserializer(defaultValue: FormData) {
  return {
    interval: defaultValue.rule_schedule.interval,
    from: safeHumanizeLookbackDuration(
      defaultValue.rule_schedule.lookback,
      DEFAULT_RULE_EXECUTION_LOOKBACK
    ),
  };
}

export function ruleScheduleSerializer(formData: FormData): {
  rule_schedule: RuleSchedule;
} {
  return {
    rule_schedule: {
      interval: formData.interval,
      lookback: formData.from,
    },
  };
}
