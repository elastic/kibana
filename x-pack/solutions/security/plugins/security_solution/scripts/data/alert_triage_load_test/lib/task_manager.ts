/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { isRecord } from '../../lib/type_guards';

/** The handful of Task Manager health figures that show overload; the raw payload is saved too. */
export interface TaskManagerSample {
  status?: string;
  /** How late tasks start relative to their `runAt`, in ms. The main saturation signal. */
  driftP50Ms?: number;
  driftP90Ms?: number;
  driftP99Ms?: number;
  /** Share of polling capacity in use. */
  loadP50?: number;
  /** Tasks whose `runAt` has passed but that have not been claimed. */
  overdueTasks?: number;
  scheduledTasks?: number;
  observedKibanaInstances?: number;
  maxThroughputPerMinute?: number;
  /** p99 drift of task types whose name mentions "workflow", keyed by task type. */
  workflowDriftP99ByTypeMs?: Record<string, number>;
}

const numberAt = (source: Record<string, unknown>, path: string): number | undefined => {
  const value: unknown = get(source, path);
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const workflowDriftByType = (health: Record<string, unknown>): Record<string, number> => {
  const byType: unknown = get(health, 'stats.runtime.value.drift_by_type');
  if (!isRecord(byType)) return {};

  return Object.fromEntries(
    Object.entries(byType).flatMap(([taskType, stat]) => {
      const p99 = isRecord(stat) ? stat.p99 : undefined;
      return /workflow/i.test(taskType) && typeof p99 === 'number' ? [[taskType, p99]] : [];
    })
  );
};

export const extractTaskManagerSample = (health: Record<string, unknown>): TaskManagerSample => {
  const status: unknown = get(health, 'status');
  return {
    status: typeof status === 'string' ? status : undefined,
    driftP50Ms: numberAt(health, 'stats.runtime.value.drift.p50'),
    driftP90Ms: numberAt(health, 'stats.runtime.value.drift.p90'),
    driftP99Ms: numberAt(health, 'stats.runtime.value.drift.p99'),
    loadP50: numberAt(health, 'stats.runtime.value.load.p50'),
    overdueTasks: numberAt(health, 'stats.workload.value.overdue'),
    scheduledTasks: numberAt(health, 'stats.workload.value.count'),
    observedKibanaInstances: numberAt(
      health,
      'stats.capacity_estimation.value.observed.observed_kibana_instances'
    ),
    maxThroughputPerMinute: numberAt(
      health,
      'stats.capacity_estimation.value.observed.max_throughput_per_minute'
    ),
    workflowDriftP99ByTypeMs: workflowDriftByType(health),
  };
};
