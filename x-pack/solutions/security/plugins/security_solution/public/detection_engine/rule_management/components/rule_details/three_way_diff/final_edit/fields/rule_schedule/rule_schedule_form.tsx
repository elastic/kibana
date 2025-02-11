/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { type RuleSchedule } from '../../../../../../../../../common/api/detection_engine/model/rule_schema/rule_schedule';
import { toSimpleRuleSchedule } from '../../../../../../../../../common/api/detection_engine/model/rule_schema/to_simple_rule_schedule';
import { SimpleRuleScheduleForm } from './simple_rule_schedule_form';
import { useFieldUpgradeContext } from '../../../rule_upgrade/field_upgrade_context';
import { FullRuleScheduleForm } from './full_rule_schedule_form';

export function RuleScheduleForm(): JSX.Element {
  const { fieldName, finalDiffableRule } = useFieldUpgradeContext();
  const canBeSimplified = useMemo(
    () => Boolean(toSimpleRuleSchedule(finalDiffableRule[fieldName] as RuleSchedule)),
    [fieldName, finalDiffableRule]
  );

  return canBeSimplified ? <SimpleRuleScheduleForm /> : <FullRuleScheduleForm />;
}
