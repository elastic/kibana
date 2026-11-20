/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The Queries, Probes and History tables give the same fixed widths to the columns from Status
// on and leave the slack to the index pattern or request before it, so their Status columns and
// their first numeric columns (ES time, Browser) line up down the flyout.

const STATUS_PX = 80;
const DETAIL_PX = 88;
const ES_TIME_PX = 80;
const CPU_TIME_PX = 88;
const DOCS_PX = 96;
const ROWS_PX = 80;

const px = (value: number): string => `${value}px`;

/** Wide enough for the Partial and Failed badges. */
export const STATUS_COLUMN_WIDTH = px(STATUS_PX);
/** The engine of a query or the plans of a probe, between the status and the ES time. */
export const DETAIL_COLUMN_WIDTH = px(DETAIL_PX);
export const ES_TIME_COLUMN_WIDTH = px(ES_TIME_PX);

export const QUERY_COLUMN_WIDTHS = {
  cpuTime: px(CPU_TIME_PX),
  docs: px(DOCS_PX),
  rows: px(ROWS_PX),
} as const;

/** The probes have no columns after the ES time, so an empty one stands in for the queries'. */
export const PROBE_FILLER_WIDTH = px(CPU_TIME_PX + DOCS_PX + ROWS_PX);

// The history has no detail column, so its status spans the status and detail columns.
export const HISTORY_COLUMN_WIDTHS = {
  status: px(STATUS_PX + DETAIL_PX),
  browser: px(ES_TIME_PX),
  server: px(CPU_TIME_PX),
  errors: px(DOCS_PX + ROWS_PX),
} as const;
