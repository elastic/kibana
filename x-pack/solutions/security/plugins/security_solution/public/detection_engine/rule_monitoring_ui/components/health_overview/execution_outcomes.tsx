/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { DonutChart } from '../donut_chart';
import type { HealthData } from './types';

export const ExecutionOutcomesChart = memo(function ExecutionOutcomesChart({
  health,
}: {
  health: HealthData;
}): JSX.Element {
  const { euiTheme } = useEuiTheme();

  const exec = health.stats_over_interval.number_of_executions;
  const succeeded = exec.by_outcome?.succeeded ?? 0;
  const warning = exec.by_outcome?.warning ?? 0;
  const failed = exec.by_outcome?.failed ?? 0;
  const failRate = exec.total > 0 ? ((failed / exec.total) * 100).toFixed(1) : '0';

  return (
    <DonutChart
      id="executionOutcomes"
      data={[
        { label: 'Succeeded', value: succeeded },
        { label: 'Warning', value: warning },
        { label: 'Failed', value: failed },
      ]}
      colors={[
        euiTheme.colors.vis.euiColorVisSuccess0,
        euiTheme.colors.vis.euiColorVisWarning0,
        euiTheme.colors.vis.euiColorVisDanger0,
      ]}
      total={exec.total}
      centerLabel={`Fail: ${failRate}%`}
      emptyTitle="No executions"
      emptyBody="No executions recorded in the selected interval."
    />
  );
});
