/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as YAML from 'yaml';
import { type Interval, intervalFromDate } from '@kbn/task-manager-plugin/server/lib/intervals';
import type { HealthDiagnosticQuery } from './health_diagnostic_service.types';

export function nextExecution(
  startDate: Date,
  endDate: Date,
  interval: Interval
): Date | undefined {
  const nextDate = intervalFromDate(startDate, interval);
  return nextDate && nextDate < endDate ? nextDate : undefined;
}

export function parseDiagnosticQueries(input: unknown): HealthDiagnosticQuery[] {
  return YAML.parseAllDocuments(input as string).map((doc) => {
    return doc.toJSON() as HealthDiagnosticQuery;
  });
}
