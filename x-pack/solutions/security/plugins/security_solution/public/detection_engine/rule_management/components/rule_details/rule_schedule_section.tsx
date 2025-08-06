/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiText } from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { normalizeDateMath } from '@kbn/securitysolution-utils/date_math';
import { toSimpleRuleSchedule } from '../../../../../common/api/detection_engine/model/rule_schema/to_simple_rule_schedule';
import { IntervalAbbrScreenReader } from '../../../../common/components/accessibility';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
import { DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS } from './constants';
import * as i18n from './translations';
import { RuleFieldName } from './rule_field_name';

interface AccessibleTimeValueProps {
  timeValue: string;
  'data-test-subj'?: string;
}

export const AccessibleTimeValue = ({
  timeValue,
  'data-test-subj': dataTestSubj,
}: AccessibleTimeValueProps) => (
  <EuiText size="s" data-test-subj={dataTestSubj}>
    <IntervalAbbrScreenReader interval={timeValue} />
  </EuiText>
);

interface IntervalProps {
  interval: string;
}

const Interval = ({ interval }: IntervalProps) => (
  <AccessibleTimeValue timeValue={interval} data-test-subj="intervalPropertyValue" />
);

interface LookBackProps {
  value: string;
}

const LookBack = ({ value }: LookBackProps) => (
  <AccessibleTimeValue timeValue={value} data-test-subj={`lookBackPropertyValue-${value}`} />
);

export interface RuleScheduleSectionProps extends React.ComponentProps<typeof EuiDescriptionList> {
  rule: Partial<RuleResponse>;
  columnWidths?: EuiDescriptionListProps['columnWidths'];
}

export const RuleScheduleSection = ({
  rule,
  columnWidths = DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS,
  ...descriptionListProps
}: RuleScheduleSectionProps) => {
  if (!rule.interval || !rule.from) {
    return null;
  }

  const to = rule.to ?? 'now';

  const simpleRuleSchedule = toSimpleRuleSchedule({
    interval: rule.interval,
    from: rule.from,
    to,
  });

  const ruleSectionListItems = !simpleRuleSchedule
    ? [
        {
          title: (
            <span data-test-subj="intervalPropertyTitle">
              <RuleFieldName label={i18n.INTERVAL_FIELD_LABEL} fieldName="rule_schedule" />
            </span>
          ),
          description: <Interval interval={rule.interval} />,
        },
        {
          title: (
            <span data-test-subj="fromToPropertyTitle">
              <RuleFieldName
                label={i18n.RULE_SOURCE_EVENTS_TIME_RANGE_FIELD_LABEL}
                fieldName="rule_schedule"
              />
            </span>
          ),
          description: (
            <span data-test-subj="fromToPropertyValue">
              {i18n.RULE_SOURCE_EVENTS_TIME_RANGE(
                normalizeDateMath(rule.from),
                normalizeDateMath(to)
              )}
            </span>
          ),
        },
      ]
    : [
        {
          title: (
            <span data-test-subj="intervalPropertyTitle">
              <RuleFieldName label={i18n.INTERVAL_FIELD_LABEL} fieldName="rule_schedule" />
            </span>
          ),
          description: <Interval interval={simpleRuleSchedule.interval} />,
        },
        {
          title: (
            <span data-test-subj="lookBackPropertyTitle">
              <RuleFieldName label={i18n.LOOK_BACK_FIELD_LABEL} fieldName="rule_schedule" />
            </span>
          ),
          description: <LookBack value={simpleRuleSchedule.lookback} />,
        },
      ];

  return (
    <div data-test-subj="listItemColumnStepRuleDescription">
      <EuiDescriptionList
        type={descriptionListProps.type ?? 'column'}
        rowGutterSize={descriptionListProps.rowGutterSize ?? 'm'}
        listItems={ruleSectionListItems}
        columnWidths={columnWidths}
        {...descriptionListProps}
      />
    </div>
  );
};
