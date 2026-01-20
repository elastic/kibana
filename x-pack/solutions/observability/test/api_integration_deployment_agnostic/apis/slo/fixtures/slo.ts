/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsSummaryDocument } from '@kbn/slo-plugin/server/services/summary_transform_generator/helpers/create_temp_summary';
import type { CreateSLOInput } from '@kbn/slo-schema';

export const TEST_SPACE_ID = 'default';

export const DEFAULT_SLO: CreateSLOInput = {
  name: 'Test SLO for api integration',
  description: 'Fixture for api integration tests',
  indicator: {
    type: 'sli.kql.custom',
    params: {
      index: 'kbn-data-forge*',
      filter: 'system.network.name: eth1',
      good: 'container.cpu.user.pct < 1',
      total: 'container.cpu.user.pct: *',
      timestampField: '@timestamp',
    },
  },
  budgetingMethod: 'occurrences',
  timeWindow: {
    duration: '7d',
    type: 'rolling',
  },
  objective: {
    target: 0.99,
  },
  tags: ['test'],
  groupBy: 'tags',
};

export function createDummySummaryDoc(
  sloId: string,
  instanceId: string,
  summaryUpdatedAt: string,
  spaceId: string = TEST_SPACE_ID
): EsSummaryDocument {
  return {
    slo: {
      id: sloId,
      instanceId,
      revision: 1,
      name: `Test SLO ${sloId}`,
      description: 'Test description',
      indicator: {
        type: 'sli.kql.custom',
        params: {
          index: 'test-index',
          filter: '',
          good: 'test: good',
          total: 'test: *',
          timestampField: '@timestamp',
        },
      },
      timeWindow: {
        duration: '7d',
        type: 'rolling',
      },
      budgetingMethod: 'occurrences',
      objective: {
        target: 0.99,
      },
      tags: ['test'],
      groupBy: '*',
      groupings: {},
    },
    service: {
      environment: null,
      name: null,
    },
    transaction: {
      name: null,
      type: null,
    },
    monitor: {
      config_id: null,
      name: null,
    },
    observer: {
      geo: {
        name: null,
      },
      name: null,
    },
    goodEvents: 100,
    totalEvents: 100,
    sliValue: 1,
    errorBudgetInitial: 0.01,
    errorBudgetConsumed: 0,
    errorBudgetRemaining: 1,
    errorBudgetEstimated: false,
    statusCode: 1,
    status: 'HEALTHY',
    isTempDoc: false,
    spaceId,
    summaryUpdatedAt,
    latestSliTimestamp: summaryUpdatedAt,
    fiveMinuteBurnRate: {
      totalEvents: 0,
      goodEvents: 0,
      value: 0,
    },
    oneHourBurnRate: {
      totalEvents: 0,
      goodEvents: 0,
      value: 0,
    },
    oneDayBurnRate: {
      totalEvents: 0,
      goodEvents: 0,
      value: 0,
    },
  };
}

export function createGroupedSummaryDoc(
  sloId: string,
  groupBy: string[],
  groupingValues: Record<string, string>,
  summaryUpdatedAt: string,
  spaceId: string = TEST_SPACE_ID
): EsSummaryDocument {
  const instanceId = groupBy.map((key) => groupingValues[key]).join(',');
  return {
    slo: {
      id: sloId,
      instanceId,
      revision: 1,
      name: `Test SLO ${sloId}`,
      description: 'Test description',
      indicator: {
        type: 'sli.kql.custom',
        params: {
          index: 'test-index',
          filter: '',
          good: 'test: good',
          total: 'test: *',
          timestampField: '@timestamp',
        },
      },
      timeWindow: {
        duration: '7d',
        type: 'rolling',
      },
      budgetingMethod: 'occurrences',
      objective: {
        target: 0.99,
      },
      tags: ['test'],
      groupBy,
      groupings: groupingValues,
    },
    service: {
      environment: null,
      name: null,
    },
    transaction: {
      name: null,
      type: null,
    },
    monitor: {
      config_id: null,
      name: null,
    },
    observer: {
      geo: {
        name: null,
      },
      name: null,
    },
    goodEvents: 100,
    totalEvents: 100,
    sliValue: 1,
    errorBudgetInitial: 0.01,
    errorBudgetConsumed: 0,
    errorBudgetRemaining: 1,
    errorBudgetEstimated: false,
    statusCode: 1,
    status: 'HEALTHY',
    isTempDoc: false,
    spaceId,
    summaryUpdatedAt,
    latestSliTimestamp: summaryUpdatedAt,
    fiveMinuteBurnRate: {
      totalEvents: 0,
      goodEvents: 0,
      value: 0,
    },
    oneHourBurnRate: {
      totalEvents: 0,
      goodEvents: 0,
      value: 0,
    },
    oneDayBurnRate: {
      totalEvents: 0,
      goodEvents: 0,
      value: 0,
    },
  };
}
