/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CronExpressionParser } from 'cron-parser';
import type { HealthDiagnosticQuery } from './health_diagnostic_service.types';

export function nextExecution(
  startDate: Date,
  endDate: Date,
  expression: string
): Date | undefined {
  const interval = CronExpressionParser.parse(expression, {
    tz: 'UTC',
    currentDate: startDate,
    endDate,
  });

  return interval.hasNext() ? interval.next().toDate() : undefined;
}

export function parseDiagnosticQueries(input: unknown): HealthDiagnosticQuery[] {
  return Object.values(input as Record<string, unknown>).map((entry) => {
    const query = entry as Record<string, unknown>;
    return {
      name: query.name,
      esQuery: query.esQuery,
      scheduleCron: query.scheduleCron,
      isEnabled: query.isEnabled,
    } as HealthDiagnosticQuery;
  });
}
