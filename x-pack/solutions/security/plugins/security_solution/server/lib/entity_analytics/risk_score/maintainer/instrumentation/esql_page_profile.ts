/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlResult } from '@elastic/elasticsearch/lib/api/types';
import { countBy, groupBy, sumBy } from 'lodash';

/** Condenses response counters and driver profiles into one page's diagnostic summary. */
export const summarizeEsqlPage = (
  response: EsqlEsqlResult,
  wallMs: number
): EsqlPageProfileSummary => {
  const responseSummary = summarizeResponse(response, wallMs);
  const driverProfiles = readDriverProfiles(response.profile);
  if (driverProfiles === undefined) return responseSummary;

  const profileSummary = summarizeDrivers(driverProfiles);
  return {
    ...responseSummary,
    ...profileSummary,
    documentsFound: responseSummary.documentsFound ?? profileSummary.documentsFound,
    valuesLoaded: responseSummary.valuesLoaded ?? profileSummary.valuesLoaded,
  };
};

export const shouldProfilePage = (
  pageNumber: number,
  interval = ESQL_PROFILE_PAGE_INTERVAL
): boolean => pageNumber > 0 && (pageNumber - 1) % interval === 0;

const summarizeResponse = (response: EsqlEsqlResult, wallMs: number): EsqlPageProfileSummary => ({
  wallMs: Math.round(wallMs),
  tookMs: numberAt(response, 'took'),
  rows: response.values?.length ?? 0,
  isPartial: response.is_partial,
  documentsFound: numberAt(response, 'documents_found'),
  valuesLoaded: numberAt(response, 'values_loaded'),
});

const summarizeDrivers = (driverProfiles: DriverProfile[]) => {
  const operatorProfiles = driverProfiles.flatMap(({ operators }) => operators);
  return {
    cpuMs: nanosToMilliseconds(sumBy(driverProfiles, 'cpuNanos')),
    drivers: countBy(driverProfiles, 'description'),
    topOperators: summarizeBusiestOperators(operatorProfiles),
    documentsFound: sumBy(operatorProfiles, 'documentsFound'),
    valuesLoaded: sumBy(operatorProfiles, 'valuesLoaded'),
  };
};

const summarizeBusiestOperators = (operatorProfiles: OperatorProfile[]) =>
  Object.entries(groupBy(operatorProfiles, 'name'))
    .map(([operator, samples]) => ({
      operator,
      processingNanos: sumBy(samples, 'processingNanos'),
    }))
    .sort((left, right) => right.processingNanos - left.processingNanos)
    .slice(0, TOP_OPERATORS)
    .map(({ operator, processingNanos }) => ({
      operator,
      ms: nanosToMilliseconds(processingNanos),
    }));

const readDriverProfiles = (profile: unknown): DriverProfile[] | undefined =>
  isRecord(profile) && Array.isArray(profile.drivers)
    ? profile.drivers.filter(isRecord).map(readDriverProfile)
    : undefined;

const readDriverProfile = (driver: Record<string, unknown>): DriverProfile => ({
  description: typeof driver.description === 'string' ? driver.description : 'unknown',
  cpuNanos: numberAt(driver, 'cpu_nanos') ?? 0,
  operators: Array.isArray(driver.operators)
    ? driver.operators.filter(isRecord).map(readOperatorProfile)
    : [],
});

const readOperatorProfile = (operator: Record<string, unknown>): OperatorProfile => ({
  name: typeof operator.operator === 'string' ? operator.operator.split('[', 1)[0] : 'unknown',
  processingNanos: numberAt(operator.status, 'process_nanos') ?? 0,
  documentsFound: numberAt(operator.status, 'documents_found') ?? 0,
  valuesLoaded: numberAt(operator.status, 'values_loaded') ?? 0,
});

const numberAt = (value: unknown, key: string): number | undefined => {
  const field = isRecord(value) ? value[key] : undefined;
  return typeof field === 'number' ? field : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nanosToMilliseconds = (nanos: number): number => Math.round(nanos / 1e5) / 10;

/** Scoring pages 1, 21, 41, ... run their ES|QL with profiling on by default. */
export const ESQL_PROFILE_PAGE_INTERVAL = 20;
const TOP_OPERATORS = 3;

interface DriverProfile {
  description: string;
  cpuNanos: number;
  operators: OperatorProfile[];
}

interface OperatorProfile {
  name: string;
  processingNanos: number;
  documentsFound: number;
  valuesLoaded: number;
}

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
