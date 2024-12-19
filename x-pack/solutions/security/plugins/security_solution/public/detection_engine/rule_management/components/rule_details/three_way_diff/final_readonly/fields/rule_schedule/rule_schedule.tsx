/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiFlexGroup, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { DEFAULT_RULE_EXECUTION_LOOKBACK } from '../../../../../../../../../common/detection_engine/constants';
import * as i18n from '../../../../translations';
import type { RuleSchedule } from '../../../../../../../../../common/api/detection_engine';
import { AccessibleTimeValue } from '../../../../rule_schedule_section';
import { safeHumanizeLookbackDuration } from '../../../utils/safe_humanize_lookback';
import { RULE_LOOKBACK_INCONSISTENCY_WARNING } from './translations';

interface RuleScheduleReadOnlyProps {
  ruleSchedule: RuleSchedule;
}

export function RuleScheduleReadOnly({ ruleSchedule }: RuleScheduleReadOnlyProps) {
  const lookbackHumanized = safeHumanizeLookbackDuration(
    ruleSchedule.lookback,
    LOOKBACK_FALLBACK_VALUE
  );

  return (
    <EuiDescriptionList
      listItems={[
        {
          title: i18n.INTERVAL_FIELD_LABEL,
          description: <AccessibleTimeValue timeValue={ruleSchedule.interval} />,
        },
        {
          title: i18n.FROM_FIELD_LABEL,
          description:
            lookbackHumanized === LOOKBACK_FALLBACK_VALUE ? (
              <EuiToolTip
                content={RULE_LOOKBACK_INCONSISTENCY_WARNING(DEFAULT_RULE_EXECUTION_LOOKBACK)}
              >
                <EuiText color="warning">
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <AccessibleTimeValue timeValue={ruleSchedule.lookback} />
                    <EuiIcon type="warning" />
                  </EuiFlexGroup>
                </EuiText>
              </EuiToolTip>
            ) : (
              <AccessibleTimeValue timeValue={lookbackHumanized} />
            ),
        },
      ]}
    />
  );
}

const LOOKBACK_FALLBACK_VALUE = '-';
