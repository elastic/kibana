/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiThemeComputed } from '@elastic/eui';
import { EuiHealth, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import type {
  AttackDiscoverySchedule,
  AttackDiscoveryScheduleExecutionStatus,
} from '@kbn/elastic-assistant-common';
import * as i18n from './translations';

const statusTextWrapperClassName = css`
  width: 100%;
  display: inline-grid;
`;

const getExecutionStatusHealthColor = (
  status: AttackDiscoveryScheduleExecutionStatus,
  euiTheme: EuiThemeComputed
) => {
  switch (status) {
    case 'active':
    case 'ok':
      return euiTheme.colors.success;
    case 'error':
      return euiTheme.colors.danger;
    case 'warning':
      return euiTheme.colors.warning;
    default:
      return 'subdued';
  }
};

const getExecutionStatusLabel = (status: AttackDiscoveryScheduleExecutionStatus) => {
  switch (status) {
    case 'active':
    case 'ok':
      return i18n.STATUS_SUCCESS;
    case 'error':
      return i18n.STATUS_FAILED;
    case 'warning':
      return i18n.STATUS_WARNING;
    default:
      return i18n.STATUS_UNKNOWN;
  }
};

interface StatusBadgeProps {
  schedule: AttackDiscoverySchedule;
}

export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(({ schedule }) => {
  const { euiTheme } = useEuiTheme();

  if (!schedule.lastExecution) {
    return null;
  }

  const executionStatus = schedule.lastExecution.status;
  const executionMessage = schedule.lastExecution.message;
  const label = getExecutionStatusLabel(executionStatus);
  const color = getExecutionStatusHealthColor(executionStatus, euiTheme);

  return (
    <EuiToolTip content={executionMessage ?? label}>
      <EuiHealth color={color} data-test-subj={'scheduleExecutionStatus'}>
        <div className={statusTextWrapperClassName}>
          <span className="eui-textTruncate">{label}</span>
        </div>
      </EuiHealth>
    </EuiToolTip>
  );
});
StatusBadge.displayName = 'StatusBadge';
