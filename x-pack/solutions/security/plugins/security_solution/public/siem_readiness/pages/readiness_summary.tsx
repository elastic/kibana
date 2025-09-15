/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiTitle, htmlIdGenerator } from '@elastic/eui';
import type { PartialTheme } from '@elastic/charts';
import { Chart, Partition, Settings, PartitionLayout } from '@elastic/charts';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { READINESS_TASKS, useReadinessTasks } from '@kbn/siem-readiness';
import { usePillarProps } from '../hooks/use_pillar_props';

const PillarsPieChart = () => {
  const { charts } = useKibana<CoreStart>().services;
  const { pillars } = usePillarProps();
  const { getLatestTasks } = useReadinessTasks();
  const htmlId = htmlIdGenerator();
  const chartId = htmlId();

  const chartBaseTheme = charts.theme.useChartsBaseTheme();

  const chartData = useMemo(() => {
    const latestTasksData = getLatestTasks.data || [];
    const completedTaskIds = new Set(
      latestTasksData.filter((task) => task.status === 'completed').map((task) => task.task_id)
    );

    // Count completed tasks per pillar
    const pillarCounts = {
      visibility: 0,
      detection: 0,
      response: 0,
    };

    let incompleteCount = 0;

    READINESS_TASKS.forEach((task) => {
      if (completedTaskIds.has(task.id)) {
        pillarCounts[task.pillar]++;
      } else {
        incompleteCount++;
      }
    });

    // Create chart data with colors from the pillars hook
    const data = [
      {
        pillar: 'Visibility',
        count: pillarCounts.visibility,
        color: pillars.visibility.color,
      },
      {
        pillar: 'Detection',
        count: pillarCounts.detection,
        color: pillars.detection.color,
      },
      {
        pillar: 'Response',
        count: pillarCounts.response,
        color: pillars.response.color,
      },
      {
        pillar: 'Incomplete',
        count: incompleteCount,
        color: '#98A2B3', // Gray color for incomplete tasks
      },
    ].filter((item) => item.count > 0); // Only show sections with data

    return data;
  }, [getLatestTasks.data, pillars]);

  const themeOverrides: PartialTheme = {
    partition: { emptySizeRatio: 0.6 },
  };

  return (
    <div>
      <EuiTitle className="eui-textCenter" size="xs">
        <h3 id={chartId}>Task Completion by Pillar</h3>
      </EuiTitle>
      <Chart size={{ height: 200 }}>
        <Settings baseTheme={chartBaseTheme} theme={themeOverrides} ariaLabelledBy={chartId} />
        <Partition
          id="pillarDonut"
          data={chartData}
          layout={PartitionLayout.sunburst}
          valueAccessor={(d) => d.count}
          layers={[
            {
              groupByRollup: (d: (typeof chartData)[0]) => d.pillar,
              shape: {
                fillColor: (groupName) => {
                  return chartData.find((d) => d.pillar === groupName)?.color;
                },
              },
            },
          ]}
        />
      </Chart>
    </div>
  );
};

export const ReadinessSummary = () => {
  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <PillarsPieChart />
        </EuiFlexItem>
        <EuiFlexItem>{'Summary'}</EuiFlexItem>
        <EuiFlexItem>{'Summary'}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
