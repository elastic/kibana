/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Interval, intervalFromDate } from '@kbn/task-manager-plugin/server/lib/intervals';
import type { Action, HealthDiagnosticQuery } from './health_diagnostic_service.types';

export function nextExecution(
  startDate: Date,
  endDate: Date,
  interval: Interval
): Date | undefined {
  const nextDate = intervalFromDate(startDate, interval);
  return nextDate && nextDate < endDate ? nextDate : undefined;
}

export function parseDiagnosticQueries(input: unknown): HealthDiagnosticQuery[] {
  return Object.values(input as Record<string, unknown>).map((entry) => {
    const query = entry as Record<string, unknown>;
    return {
      name: query.name,
      esQuery: query.esQuery,
      scheduleInterval: query.scheduleInterval,
      isEnabled: query.isEnabled,
      filterlist: query.filterlist as Record<string, Action>,
    } as HealthDiagnosticQuery;
  });
}
