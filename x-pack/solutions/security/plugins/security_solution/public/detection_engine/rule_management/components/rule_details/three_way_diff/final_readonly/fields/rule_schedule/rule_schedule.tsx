/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import type { RuleSchedule } from '../../../../../../../../../common/api/detection_engine/model/rule_schema/rule_schedule';
import { toSimpleRuleSchedule } from '../../../../../../../../../common/api/detection_engine/model/rule_schema/to_simple_rule_schedule';
import * as i18n from '../../../../translations';
import { AccessibleTimeValue } from '../../../../rule_schedule_section';

interface RuleScheduleReadOnlyProps {
  ruleSchedule: RuleSchedule;
}

export function RuleScheduleReadOnly({ ruleSchedule }: RuleScheduleReadOnlyProps) {
  const simpleRuleSchedule = useMemo(() => toSimpleRuleSchedule(ruleSchedule), [ruleSchedule]);

  if (simpleRuleSchedule) {
    return (
      <EuiDescriptionList
        listItems={[
          {
            title: i18n.INTERVAL_FIELD_LABEL,
            description: <AccessibleTimeValue timeValue={simpleRuleSchedule.interval} />,
          },
          {
            title: i18n.LOOK_BACK_FIELD_LABEL,
            description: <AccessibleTimeValue timeValue={simpleRuleSchedule.lookback} />,
          },
        ]}
      />
    );
  }

  return (
    <EuiDescriptionList
      listItems={[
        {
          title: i18n.INTERVAL_FIELD_LABEL,
          description: <AccessibleTimeValue timeValue={ruleSchedule.interval} />,
        },
        {
          title: i18n.RULE_SOURCE_EVENTS_TIME_RANGE_FIELD_LABEL,
          description: (
            <span>{i18n.RULE_SOURCE_EVENTS_TIME_RANGE(ruleSchedule.from, ruleSchedule.to)}</span>
          ),
        },
      ]}
    />
  );
}
