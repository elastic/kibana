/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiFlexGroup, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { toSimpleRuleSchedule } from '../../../../../../../../../common/detection_engine/rule_management/to_simple_rule_schedule';
import * as i18n from '../../../../translations';
import type { RuleSchedule } from '../../../../../../../../../common/api/detection_engine';
import { AccessibleTimeValue } from '../../../../rule_schedule_section';
import { RULE_MAY_RUN_WITH_GAPS_WARNING } from './translations';

interface RuleScheduleReadOnlyProps {
  ruleSchedule: RuleSchedule;
}

export function RuleScheduleReadOnly({ ruleSchedule }: RuleScheduleReadOnlyProps) {
  const simpleRuleSchedule = toSimpleRuleSchedule(ruleSchedule);

  if (!simpleRuleSchedule) {
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
              <EuiToolTip content={RULE_MAY_RUN_WITH_GAPS_WARNING}>
                <EuiText color="warning">
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    {i18n.RULE_SOURCE_EVENTS_TIME_RANGE(ruleSchedule.from, ruleSchedule.to)}
                    <EuiIcon type="warning" />
                  </EuiFlexGroup>
                </EuiText>
              </EuiToolTip>
            ),
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
