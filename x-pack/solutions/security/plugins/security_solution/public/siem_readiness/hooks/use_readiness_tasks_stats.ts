/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { READINESS_TASKS, useReadinessTasks } from '@kbn/siem-readiness';
import { usePillarProps } from './use_pillar_props';

interface PillarData {
  pillar: keyof ReturnType<typeof usePillarProps>['pillars'];
  pillarName: string;
  pillarColor: string;
  completed: number;
  total: number;
}

interface ChartDataItem {
  pillar: string;
  count: number;
  color: string;
}

interface ReadinessTasksStats {
  pillarsData: PillarData[];
  chartData: ChartDataItem[];
  totalCompleted: number;
  totalTasks: number;
}

export const useReadinessTasksStats = (): { readinessTasksStats: ReadinessTasksStats } => {
  const { pillars } = usePillarProps();
  const { getLatestTasks } = useReadinessTasks();
  const { euiTheme } = useEuiTheme();

  const readinessTasksStats = useMemo((): ReadinessTasksStats => {
    const latestTasksData = getLatestTasks.data || [];
    const completedTaskIds = new Set(
      latestTasksData.filter((task) => task.status === 'completed').map((task) => task.task_id)
    );

    console.log(latestTasksData);

    // Count total and completed tasks per pillar
    const pillarStats = {
      visibility: { completed: 0, total: 0 },
      detection: { completed: 0, total: 0 },
      response: { completed: 0, total: 0 },
    };

    READINESS_TASKS.forEach((task) => {
      pillarStats[task.pillar].total++;
      if (completedTaskIds.has(task.id)) {
        pillarStats[task.pillar].completed++;
      }
    });

    // Calculate totals
    const totalCompleted = Object.values(pillarStats).reduce(
      (sum, stat) => sum + stat.completed,
      0
    );
    const totalTasks = READINESS_TASKS.length;
    const incompleteCount = totalTasks - totalCompleted;

    // Create pillars data for table
    const pillarsData: PillarData[] = Object.entries(pillars).map(([key, pillar]) => ({
      pillar: key as keyof typeof pillars,
      pillarName: pillar.displayName,
      pillarColor: pillar.color,
      completed: pillarStats[key as keyof typeof pillarStats].completed,
      total: pillarStats[key as keyof typeof pillarStats].total,
    }));

    // Create chart data
    const chartData: ChartDataItem[] = [
      {
        pillar: 'Visibility',
        count: pillarStats.visibility.completed,
        color: pillars.visibility.color,
      },
      {
        pillar: 'Detection',
        count: pillarStats.detection.completed,
        color: pillars.detection.color,
      },
      {
        pillar: 'Response',
        count: pillarStats.response.completed,
        color: pillars.response.color,
      },
      {
        pillar: 'Incomplete',
        count: incompleteCount,
        color: euiTheme.colors.severity.unknown,
      },
    ].filter((item) => item.count > 0);

    return {
      pillarsData,
      chartData,
      totalCompleted,
      totalTasks,
    };
  }, [pillars, getLatestTasks, euiTheme.colors.severity.unknown]);

  return {
    readinessTasksStats,
  };
};
