/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SchemaOutput } from '../schema_output';
import { PingErrorType, PingType } from '../ping/ping';

export const StateType = z.looseObject({
  timestamp: z.string(),
  url: z.looseObject({
    domain: z.string().optional(),
    full: z.string().optional(),
    path: z.string().optional(),
    port: z.number().optional(),
    scheme: z.string().optional(),
  }),
  summaryPings: z.array(PingType),
  summary: z.looseObject({
    status: z.string().optional(),
    up: z.number().optional(),
    down: z.number().optional(),
  }),
  monitor: z.looseObject({
    type: z.string(),
    name: z.string().optional(),
    checkGroup: z.string().optional(),
    duration: z.looseObject({ us: z.number() }).optional(),
  }),
  tls: z
    .looseObject({
      not_after: z.union([z.string(), z.null()]).optional(),
      not_before: z.union([z.string(), z.null()]).optional(),
    })
    .optional(),
  observer: z
    .looseObject({
      geo: z.looseObject({
        name: z.array(z.string()),
      }),
    })
    .optional(),
  service: z
    .looseObject({
      name: z.string().optional(),
    })
    .optional(),
  error: PingErrorType.optional(),
});

export type MonitorSummaryState = SchemaOutput<typeof StateType>;

export const HistogramPointType = z.looseObject({
  timestamp: z.number(),
  // Missing key and explicit undefined both accepted (io-ts was union with undefined).
  up: z.union([z.number(), z.undefined()]).optional(),
  down: z.union([z.number(), z.undefined()]).optional(),
});

export type HistogramPoint = SchemaOutput<typeof HistogramPointType>;

export const HistogramType = z.looseObject({
  points: z.array(HistogramPointType),
});

export type Histogram = SchemaOutput<typeof HistogramType>;

export const MonitorSummaryType = z.looseObject({
  monitor_id: z.string(),
  state: StateType,
  histogram: HistogramType.optional(),
  minInterval: z.number().optional(),
  configId: z.string().optional(),
});

export type MonitorSummary = SchemaOutput<typeof MonitorSummaryType>;

export const MonitorSummariesResultType = z.looseObject({
  totalSummaryCount: z.number().optional(),
  summaries: z.array(MonitorSummaryType),
  prevPagePagination: z.union([z.string(), z.null()]),
  nextPagePagination: z.union([z.string(), z.null()]),
});

export type MonitorSummariesResult = SchemaOutput<typeof MonitorSummariesResultType>;

export const FetchMonitorStatesQueryArgsType = z.looseObject({
  pagination: z.string().optional(),
  filters: z.string().optional(),
  statusFilter: z.string().optional(),
  query: z.string().optional(),
  dateRangeStart: z.string(),
  dateRangeEnd: z.string(),
  pageSize: z.number(),
});

export type FetchMonitorStatesQueryArgs = SchemaOutput<typeof FetchMonitorStatesQueryArgsType>;

export enum CursorDirection {
  AFTER = 'AFTER',
  BEFORE = 'BEFORE',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
