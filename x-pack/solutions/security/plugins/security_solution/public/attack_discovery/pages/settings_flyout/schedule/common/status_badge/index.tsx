/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiHealth, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import {
  getExecutionStatusHealthColor,
  getExecutionStatusLabel,
} from '../../utils/execution_status';

const statusTextWrapperClassName = css`
  width: 100%;
  display: inline-grid;
`;

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
