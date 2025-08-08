/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiTitle } from '@elastic/eui';
import { type AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';

import { useKibana } from '../../../../../../common/lib/kibana';
import { useFetchScheduleRuleType } from '../../logic/use_fetch_schedule_rule_type';

const css = { minHeight: 600 };

interface Props {
  schedule: AttackDiscoverySchedule;
}

export const ScheduleExecutionLogs: React.FC<Props> = React.memo(({ schedule }) => {
  const {
    triggersActionsUi: { getRuleEventLogList: RuleEventLogList },
  } = useKibana().services;

  const { data: scheduleRuleType } = useFetchScheduleRuleType();

  return (
    <>
      <EuiTitle data-test-subj="executionLogsTitle" size="s">
        <h3>{i18n.EXECUTION_LOGS_TITLE}</h3>
      </EuiTitle>
      <EuiHorizontalRule />
      <EuiFlexGroup css={css} direction={'column'} data-test-subj={'executionEventLogs'}>
        <EuiFlexItem>
          {scheduleRuleType && (
            <RuleEventLogList ruleId={schedule.id} ruleType={scheduleRuleType} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});
ScheduleExecutionLogs.displayName = 'ScheduleExecutionLogs';
