/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  convertTimeDurationToMs,
  toLargestTimeDuration,
} from '@kbn/securitysolution-utils/time_duration';
import { toSimpleRuleSchedule } from '../../../../../../../../../common/detection_engine/rule_management/to_simple_rule_schedule';
import { type FormSchema, type FormData } from '../../../../../../../../shared_imports';
import { schema } from '../../../../../../../rule_creation_ui/components/step_schedule_rule/schema';
import type {
  DiffableRule,
  RuleSchedule,
} from '../../../../../../../../../common/api/detection_engine';
import { RuleFieldEditFormWrapper } from '../../../field_final_side';
import { SimpleRuleScheduleAdapter } from './simple_rule_schedule_adapter';
import type { SimpleRuleSchedule } from '../../../../../../../../../common/api/detection_engine/model/rule_schema/simple_rule_schedule';
import { invariant } from '../../../../../../../../../common/utils/invariant';

export function SimpleRuleScheduleForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={SimpleRuleScheduleAdapter}
      ruleFieldFormSchema={SIMPLE_RULE_SCHEDULE_SCHEMA}
      serializer={serializer}
      deserializer={deserializer}
    />
  );
}

const SIMPLE_RULE_SCHEDULE_SCHEMA = {
  interval: schema.interval,
  from: schema.from,
} as FormSchema<{
  interval: string;
  from: string;
}>;

function deserializer(_: unknown, finalRule: DiffableRule): Partial<SimpleRuleSchedule> {
  const simpleRuleSchedule = toSimpleRuleSchedule(finalRule.rule_schedule);

  invariant(simpleRuleSchedule, 'Unable to calculate simple rule schedule');

  return {
    interval: simpleRuleSchedule?.interval,
    lookback: simpleRuleSchedule?.lookback,
  };
}

function serializer(formData: FormData): {
  rule_schedule: RuleSchedule;
} {
  const interval = formData.interval as string;
  const lookback = formData.lookback as string;

  const intervalMs = convertTimeDurationToMs(interval);
  const lookbackMs = convertTimeDurationToMs(lookback);

  invariant(intervalMs !== undefined && intervalMs > 0, 'Rule interval is invalid');
  invariant(lookbackMs !== undefined && lookbackMs >= 0, "Rule's look-back is invalid");

  const from = `now-${toLargestTimeDuration(intervalMs + lookbackMs)}`;

  return {
    rule_schedule: {
      interval: formData.interval,
      from,
      to: 'now',
    },
  };
}
