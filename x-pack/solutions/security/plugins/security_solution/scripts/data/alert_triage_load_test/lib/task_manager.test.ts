/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractTaskManagerSample } from './task_manager';

describe('extractTaskManagerSample', () => {
  it('reads drift, load, workload and capacity from the health payload', () => {
    const sample = extractTaskManagerSample({
      status: 'OK',
      stats: {
        runtime: {
          value: {
            drift: { p50: 100, p90: 900, p95: 1500, p99: 4000 },
            load: { p50: 35 },
            drift_by_type: {
              'workflow:run': { p99: 7000 },
              'alerting:siem.queryRule': { p99: 50 },
            },
          },
        },
        workload: { value: { count: 420, overdue: 12 } },
        capacity_estimation: {
          value: {
            observed: { observed_kibana_instances: 2, max_throughput_per_minute: 400 },
          },
        },
      },
    });

    expect(sample).toEqual({
      status: 'OK',
      driftP50Ms: 100,
      driftP90Ms: 900,
      driftP99Ms: 4000,
      loadP50: 35,
      overdueTasks: 12,
      scheduledTasks: 420,
      observedKibanaInstances: 2,
      maxThroughputPerMinute: 400,
      workflowDriftP99ByTypeMs: { 'workflow:run': 7000 },
    });
  });

  it('leaves out what the payload does not carry', () => {
    expect(extractTaskManagerSample({})).toEqual({
      status: undefined,
      driftP50Ms: undefined,
      driftP90Ms: undefined,
      driftP99Ms: undefined,
      loadP50: undefined,
      overdueTasks: undefined,
      scheduledTasks: undefined,
      observedKibanaInstances: undefined,
      maxThroughputPerMinute: undefined,
      workflowDriftP99ByTypeMs: {},
    });
  });
});
