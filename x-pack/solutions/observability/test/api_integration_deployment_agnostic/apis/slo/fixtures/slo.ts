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
  spaceId: string = TEST_SPACE_ID,
  overrides?: {
    name?: string;
    description?: string;
    tags?: string[];
    groupBy?: string | string[];
  }
): EsSummaryDocument {
  return {
    slo: {
      id: sloId,
      instanceId,
      revision: 1,
      name: overrides?.name ?? `Test SLO ${sloId}`,
      description: overrides?.description ?? 'Test description',
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
      tags: overrides?.tags ?? ['test'],
      groupBy: overrides?.groupBy ?? '*',
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

interface GroupedSummaryDocOptions {
  spaceId?: string;
  status?: 'HEALTHY' | 'DEGRADING' | 'VIOLATED' | 'NO_DATA';
  indicator?: {
    type: string;
    params: Record<string, unknown>;
  };
  service?: {
    name: string | null;
    environment: string | null;
  };
}

const STATUS_CODE_MAP = { HEALTHY: 1, DEGRADING: 2, VIOLATED: 3, NO_DATA: 0 };

const DEFAULT_INDICATOR = {
  type: 'sli.kql.custom',
  params: {
    index: 'test-index',
    filter: '',
    good: 'test: good',
    total: 'test: *',
    timestampField: '@timestamp',
  },
};

export function createGroupedSummaryDoc(
  sloId: string,
  groupBy: string[],
  groupingValues: Record<string, string>,
  summaryUpdatedAt: string,
  optionsOrSpaceId: GroupedSummaryDocOptions | string = {}
): EsSummaryDocument {
  // Support legacy signature where 5th param was spaceId string
  const options: GroupedSummaryDocOptions =
    typeof optionsOrSpaceId === 'string' ? { spaceId: optionsOrSpaceId } : optionsOrSpaceId;

  const {
    spaceId = TEST_SPACE_ID,
    status = 'HEALTHY',
    indicator = DEFAULT_INDICATOR,
    service = { name: null, environment: null },
  } = options;

  const instanceId = groupBy.map((key) => groupingValues[key]).join(',');

  return {
    slo: {
      id: sloId,
      instanceId,
      revision: 1,
      name: `Test SLO ${sloId}`,
      description: 'Test description',
      indicator: indicator as EsSummaryDocument['slo']['indicator'],
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
    service,
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
    goodEvents: status === 'HEALTHY' ? 100 : status === 'DEGRADING' ? 95 : 80,
    totalEvents: 100,
    sliValue: status === 'HEALTHY' ? 1 : status === 'DEGRADING' ? 0.95 : 0.8,
    errorBudgetInitial: 0.01,
    errorBudgetConsumed: status === 'HEALTHY' ? 0 : status === 'DEGRADING' ? 0.5 : 1,
    errorBudgetRemaining: status === 'HEALTHY' ? 1 : status === 'DEGRADING' ? 0.5 : 0,
    errorBudgetEstimated: false,
    statusCode: STATUS_CODE_MAP[status],
    status,
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

/** Helper to create APM SLO summary docs with sensible defaults */
export function createApmSummaryDoc(
  sloId: string,
  serviceName: string,
  status: 'HEALTHY' | 'DEGRADING' | 'VIOLATED' | 'NO_DATA',
  summaryUpdatedAt: string,
  options: {
    environment?: string;
    indicatorType?: 'sli.apm.transactionDuration' | 'sli.apm.transactionErrorRate';
    spaceId?: string;
  } = {}
): EsSummaryDocument {
  const {
    environment = 'production',
    indicatorType = 'sli.apm.transactionDuration',
    spaceId,
  } = options;

  return createGroupedSummaryDoc(
    sloId,
    ['service.name'],
    { 'service.name': serviceName },
    summaryUpdatedAt,
    {
      spaceId,
      status,
      indicator: {
        type: indicatorType,
        params: {
          service: serviceName,
          environment,
          transactionType: 'request',
          transactionName: '',
          threshold: 500,
          index: 'metrics-apm*',
        },
      },
      service: {
        name: serviceName,
        environment,
      },
    }
  );
}
