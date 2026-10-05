/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { useAutomationRunsInRange } from '../../hooks/use_automations';
import { RunsSparkline } from './runs_sparkline';
import { listLabels } from '../translations';

export const AutomationRunsCell = ({
  id,
  startedAfter,
  startedBefore,
}: {
  id: string;
  startedAfter: string;
  startedBefore: string;
}) => {
  const { data, isInitialLoading, isError } = useAutomationRunsInRange(
    id,
    startedAfter,
    startedBefore
  );

  if (isInitialLoading) {
    return <EuiLoadingSpinner size="s" />;
  }

  if (isError) {
    return <EuiIconTip type="warning" color="warning" content={listLabels.runsLoadError} />;
  }

  if (!data?.total) {
    return <EuiText size="s">0</EuiText>;
  }

  return (
    <EuiToolTip content={listLabels.viewRuns}>
      <EuiLink
        data-test-subj="automationRuns"
        color="primary"
        onClick={(event: React.MouseEvent) => event.stopPropagation()}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <strong>{data.total}</strong>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <RunsSparkline
              runs={data.runs}
              startedAfter={startedAfter}
              startedBefore={startedBefore}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiLink>
    </EuiToolTip>
  );
};
