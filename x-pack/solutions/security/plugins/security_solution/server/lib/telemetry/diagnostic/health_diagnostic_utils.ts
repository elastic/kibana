/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Interval,
  parseIntervalAsSecond,
} from '@kbn/task-manager-plugin/server/lib/intervals';
import type { HealthDiagnosticQuery } from './health_diagnostic_service.types';

export function nextExecution(
  startDate: Date,
  endDate: Date,
  interval: Interval
): Date | undefined {
  const intervalInSeconds = parseIntervalAsSecond(interval);

  const base = new Date(Date.UTC(startDate.getUTCFullYear(), 0, 1));
  const intervalMs = intervalInSeconds * 1000;
  const diff = startDate.getTime() + 1000 - base.getTime();
  const intervalsPassed = Math.ceil(diff / intervalMs);
  const next = new Date(base.getTime() + intervalsPassed * intervalMs);

  return next < endDate ? next : undefined;
}

export function parseDiagnosticQueries(input: unknown): HealthDiagnosticQuery[] {
  return Object.values(input as Record<string, unknown>).map((entry) => {
    const query = entry as Record<string, unknown>;
    return {
      name: query.name,
      esQuery: query.esQuery,
      scheduleInterval: query.scheduleInterval,
      isEnabled: query.isEnabled,
    } as HealthDiagnosticQuery;
  });
}
