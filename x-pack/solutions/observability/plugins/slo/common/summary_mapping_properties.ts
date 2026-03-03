/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SUMMARY_MAPPING_PROPERTIES = {
  service: {
    properties: {
      name: { type: 'keyword' as const },
      environment: { type: 'keyword' as const },
    },
  },
  transaction: {
    properties: {
      name: { type: 'keyword' as const },
      type: { type: 'keyword' as const },
    },
  },
  monitor: {
    properties: {
      id: { type: 'keyword' as const },
      config_id: { type: 'keyword' as const },
      name: { type: 'keyword' as const },
    },
  },
  observer: {
    properties: {
      name: { type: 'keyword' as const },
      geo: {
        properties: {
          name: { type: 'keyword' as const },
        },
      },
    },
  },
  slo: {
    properties: {
      id: { type: 'keyword' as const, ignore_above: 256 },
      revision: { type: 'long' as const },
      groupBy: { type: 'keyword' as const },
      groupings: { type: 'flattened' as const },
      instanceId: {
        type: 'keyword' as const,
        fields: { text: { type: 'text' as const } },
      },
      name: {
        type: 'text' as const,
        fields: { keyword: { type: 'keyword' as const } },
      },
      description: { type: 'text' as const },
      tags: { type: 'keyword' as const },
      indicator: {
        dynamic: false as const,
        properties: { type: { type: 'keyword' as const } },
      },
      objective: {
        properties: {
          target: { type: 'double' as const },
          timesliceTarget: { type: 'double' as const },
          timesliceWindow: { type: 'keyword' as const },
        },
      },
      budgetingMethod: { type: 'keyword' as const },
      timeWindow: {
        properties: {
          duration: { type: 'keyword' as const },
          type: { type: 'keyword' as const },
        },
      },
      createdAt: { type: 'date' as const, format: 'date_optional_time||epoch_millis' },
      updatedAt: { type: 'date' as const, format: 'date_optional_time||epoch_millis' },
      createdBy: { type: 'keyword' as const },
      updatedBy: { type: 'keyword' as const },
    },
  },
  sliValue: { type: 'double' as const },
  goodEvents: { type: 'long' as const },
  totalEvents: { type: 'long' as const },
  errorBudgetInitial: { type: 'double' as const },
  errorBudgetConsumed: { type: 'double' as const },
  errorBudgetRemaining: { type: 'double' as const },
  errorBudgetEstimated: { type: 'boolean' as const },
  statusCode: { type: 'byte' as const },
  status: { type: 'keyword' as const },
  isTempDoc: { type: 'boolean' as const },
  latestSliTimestamp: { type: 'date' as const, format: 'date_optional_time||epoch_millis' },
  summaryUpdatedAt: { type: 'date' as const, format: 'date_optional_time||epoch_millis' },
  spaceId: { type: 'keyword' as const },
  fiveMinuteBurnRate: {
    properties: {
      goodEvents: { type: 'long' as const },
      totalEvents: { type: 'long' as const },
      value: { type: 'double' as const },
    },
  },
  oneHourBurnRate: {
    properties: {
      goodEvents: { type: 'long' as const },
      totalEvents: { type: 'long' as const },
      value: { type: 'double' as const },
    },
  },
  oneDayBurnRate: {
    properties: {
      goodEvents: { type: 'long' as const },
      totalEvents: { type: 'long' as const },
      value: { type: 'double' as const },
    },
  },
};
