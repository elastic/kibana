/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindGapsResponseBody } from '@kbn/alerting-plugin/common/routes/gaps/apis/find';

import type { FindBackfillResponseBody } from '@kbn/alerting-plugin/common/routes/backfill/apis/find';

export type Backfill = FindBackfillResponseBody['data']['0'];

export type BackfillStatus = Backfill['status'];

export type Gap = FindGapsResponseBody['data']['0'];
export type GapStatus = Gap['status'];

export interface BackfillStats {
  total: number;
  complete: number;
  running: number;
  pending: number;
  error: number;
  timeout: number;
}

export type BackfillRow = Backfill & BackfillStats;

export interface TimeRange {
  startDate: moment.Moment;
  endDate: moment.Moment;
}

export interface ScheduleBackfillProps {
  ruleIds: string[];
  timeRange: TimeRange;
}
