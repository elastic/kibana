/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleSchedule } from '../../../../../../../../../common/api/detection_engine/model/rule_schema/rule_schedule';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { type FormData } from '../../../../../../../../shared_imports';
import { RuleFieldEditFormWrapper } from '../../../field_final_side';
import { FullRuleScheduleAdapter } from './full_rule_schedule_adapter';

export function FullRuleScheduleForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={FullRuleScheduleAdapter}
      serializer={serializer}
      deserializer={deserializer}
    />
  );
}

function deserializer(_: unknown, finalRule: DiffableRule): RuleSchedule {
  return {
    interval: finalRule.rule_schedule.interval,
    from: finalRule.rule_schedule.from,
    to: finalRule.rule_schedule.to,
  };
}

function serializer(formData: FormData): {
  rule_schedule: RuleSchedule;
} {
  return {
    rule_schedule: {
      interval: formData.interval,
      from: formData.from,
      to: formData.to,
    },
  };
}
