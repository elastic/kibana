/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlResult } from '@elastic/elasticsearch/lib/api/types';

/** Scoring pages 1, 21, 41, ... run their ES|QL with profiling on. */
export const ESQL_PROFILE_PAGE_INTERVAL = 20;

const TOP_OPERATORS = 3;

export const shouldProfilePage = (
  pageNumber: number,
  interval = ESQL_PROFILE_PAGE_INTERVAL
): boolean => pageNumber > 0 && (pageNumber - 1) % interval === 0;

export interface EsqlPageProfileSummary {
  wallMs: number;
  tookMs?: number;
  rows: number;
  isPartial?: boolean;
  documentsFound?: number;
  valuesLoaded?: number;
  cpuMs?: number;
  /** Driver count per driver description, e.g. `{ data: 6, node_reduce: 1, final: 1 }`. */
  drivers?: Record<string, number>;
  /** The operators with the most processing time, summed over every driver. */
  topOperators?: Array<{ operator: string; ms: number }>;
}

/**
 * Condenses an ES|QL response into a loggable summary. The profile section is unstable across
 * Elasticsearch versions, so every field is read defensively and missing ones are left out.
 */
export const summarizeEsqlPage = (
  response: EsqlEsqlResult,
  wallMs: number
): EsqlPageProfileSummary => {
  const summary: EsqlPageProfileSummary = {
    wallMs: Math.round(wallMs),
    tookMs: typeof response.took === 'number' ? response.took : undefined,
    rows: response.values?.length ?? 0,
    isPartial: response.is_partial,
  };

  const topLevel: unknown = response;
  if (isRecord(topLevel)) {
    summary.documentsFound = numberAt(topLevel, 'documents_found');
    summary.valuesLoaded = numberAt(topLevel, 'values_loaded');
  }

  const profile: unknown = response.profile;
  if (!isRecord(profile) || !Array.isArray(profile.drivers)) {
    return summary;
  }

  const drivers: Record<string, number> = {};
  const operatorNanos = new Map<string, number>();
  let cpuNanos = 0;
  let documentsFound = 0;
  let valuesLoaded = 0;
  for (const driver of profile.drivers.filter(isRecord)) {
    const description = typeof driver.description === 'string' ? driver.description : 'unknown';
    drivers[description] = (drivers[description] ?? 0) + 1;
    cpuNanos += numberAt(driver, 'cpu_nanos') ?? 0;
    const operators = Array.isArray(driver.operators) ? driver.operators.filter(isRecord) : [];
    for (const operator of operators) {
      const status = isRecord(operator.status) ? operator.status : {};
      const name =
        typeof operator.operator === 'string' ? operator.operator.split('[', 1)[0] : 'unknown';
      operatorNanos.set(
        name,
        (operatorNanos.get(name) ?? 0) + (numberAt(status, 'process_nanos') ?? 0)
      );
      documentsFound += numberAt(status, 'documents_found') ?? 0;
      valuesLoaded += numberAt(status, 'values_loaded') ?? 0;
    }
  }

  summary.cpuMs = roundMs(cpuNanos);
  summary.drivers = drivers;
  summary.topOperators = [...operatorNanos.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_OPERATORS)
    .map(([operator, nanos]) => ({ operator, ms: roundMs(nanos) }));
  summary.documentsFound ??= documentsFound;
  summary.valuesLoaded ??= valuesLoaded;
  return summary;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const numberAt = (record: Record<string, unknown>, key: string): number | undefined => {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
};

const roundMs = (nanos: number): number => Math.round(nanos / 1e5) / 10;
