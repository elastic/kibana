/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeDuration } from '@kbn/securitysolution-utils/time_duration';
import { normalizeDateMath } from '@kbn/securitysolution-utils/date_math';
import type { RuleSchedule } from '../../../api/detection_engine/model/rule_schema/rule_schedule';
import type { RuleResponse } from '../../../api/detection_engine/model/rule_schema';

export const extractRuleSchedule = (rule: RuleResponse): RuleSchedule => {
  const interval = TimeDuration.parse(rule.interval) ?? new TimeDuration(5, 'm');
  const from = rule.from ?? 'now-6m';
  const to = rule.to ?? 'now';

  return {
    interval: interval.toString(),
    from: normalizeDateMath(from),
    to: normalizeDateMath(to),
  };
};
