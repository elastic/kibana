/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import type {
  FetchMonitorStatesQueryArgsType,
  HistogramPointType,
  HistogramType,
  MonitorSummariesResultType,
  MonitorSummaryType,
  StateType,
} from '../schemas/monitor_state';

export type MonitorSummaryState = SchemaOutput<typeof StateType>;

export type HistogramPoint = SchemaOutput<typeof HistogramPointType>;

export type Histogram = SchemaOutput<typeof HistogramType>;

export type MonitorSummary = SchemaOutput<typeof MonitorSummaryType>;

export type MonitorSummariesResult = SchemaOutput<typeof MonitorSummariesResultType>;

export type FetchMonitorStatesQueryArgs = SchemaOutput<typeof FetchMonitorStatesQueryArgsType>;

export enum CursorDirection {
  AFTER = 'AFTER',
  BEFORE = 'BEFORE',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
