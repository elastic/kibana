/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { READINESS_TASKS, useReadinessTasks } from '@kbn/siem-readiness';

export interface PillarStats {
  completed: number;
  total: number;
}

interface PillarsStatsMap {
  visibility: PillarStats;
  detection: PillarStats;
  response: PillarStats;
}

interface ReadinessTasksStats {
  pillarStatsMap: PillarsStatsMap;
  totalCompleted: number;
  totalTasks: number;
  totalIncomplete: number;
}

export const useReadinessTasksStats = (): { readinessTasksStats: ReadinessTasksStats } => {
  const { getLatestTasks } = useReadinessTasks();

  const readinessTasksStats = useMemo((): ReadinessTasksStats => {
    const latestTasksData = getLatestTasks.data || [];
    const completedTaskIds = new Set(
      latestTasksData.filter((task) => task.status === 'completed').map((task) => task.task_id)
    );

    const pillarStatsMap: PillarsStatsMap = {
      visibility: { completed: 0, total: 0 },
      detection: { completed: 0, total: 0 },
      response: { completed: 0, total: 0 },
    };

    READINESS_TASKS.forEach((task) => {
      pillarStatsMap[task.pillar].total++;
      if (completedTaskIds.has(task.id)) {
        pillarStatsMap[task.pillar].completed++;
      }
    });

    const totalTasks = READINESS_TASKS.length;
    const totalCompleted: number = Object.values(pillarStatsMap).reduce(
      (sum, stat) => sum + stat.completed,
      0
    );
    const totalIncomplete = totalTasks - totalCompleted;

    return {
      pillarStatsMap,
      totalCompleted,
      totalTasks,
      totalIncomplete,
    };
  }, [getLatestTasks]);

  return {
    readinessTasksStats,
  };
};
