/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { parseDateMath } from '@kbn/securitysolution-utils/date_math';
import { parseTimeDuration } from '@kbn/securitysolution-utils/time_duration';
import { invariant } from '../../../../../../../../../common/utils/invariant';
import type {
  DiffableRule,
  RuleSchedule,
} from '../../../../../../../../../common/api/detection_engine';
import { type FormData } from '../../../../../../../../shared_imports';
import { RuleFieldEditFormWrapper } from '../../../field_final_side';
import type { FullRuleSchedule } from './full_rule_schedule_adapter';
import { FullRuleScheduleAdapter } from './full_rule_schedule_adapter';
import { toDateMath } from './utils/to_date_math';
import { toTimeDuration } from './utils/to_time_duration';

export function FullRuleScheduleForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={FullRuleScheduleAdapter}
      serializer={serializer}
      deserializer={deserializer}
    />
  );
}

function deserializer(_: unknown, finalRule: DiffableRule): Partial<FullRuleSchedule> {
  const fromParsed = parseDateMath(finalRule.rule_schedule.from);
  const toParsed = parseDateMath(finalRule.rule_schedule.to);

  return {
    interval: finalRule.rule_schedule.interval,
    fromOffset: fromParsed
      ? toTimeDuration(fromParsed.offsetValue, fromParsed.offsetUnit)
      : undefined,
    toOffset: toParsed ? toTimeDuration(toParsed.offsetValue, toParsed.offsetUnit) : undefined,
  };
}

function serializer(formData: FormData): {
  rule_schedule: RuleSchedule;
} {
  const fullRuleSchedule = formData as FullRuleSchedule;
  const fromOffsetParsed = parseTimeDuration(fullRuleSchedule.fromOffset);
  const toOffsetParsed = parseTimeDuration(fullRuleSchedule.toOffset);

  invariant(fromOffsetParsed, 'Invalid from offset');
  invariant(toOffsetParsed, 'Invalid to offset');

  return {
    rule_schedule: {
      interval: fullRuleSchedule.interval,
      from: toDateMath(fromOffsetParsed),
      to: toDateMath(toOffsetParsed),
    },
  };
}
