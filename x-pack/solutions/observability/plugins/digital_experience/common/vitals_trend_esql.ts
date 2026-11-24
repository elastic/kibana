/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
  SERVICE_ENVIRONMENT,
  TELEMETRY_SDK_LANGUAGE,
} from '@kbn/apm-types';
import { escapeStringValue } from '@kbn/esql-utils';
import type { CoreWebVital } from './core_web_vitals';
import {
  BROWSER_SDK_LANGUAGE,
  ENVIRONMENT_FIELDS,
  EVENT_WEB_VITAL,
  OTEL_LOGS_INDEX,
} from './otel_data';
import {
  SOURCE_EVENT_NAME_FIELD,
  SOURCE_SERVICE_NAME_FIELD,
  SOURCE_WEB_VITAL_NAME_FIELD,
  SOURCE_WEB_VITAL_VALUE_FIELD,
} from './otel_source_fields';
import type { OverviewFilters } from './overview_filters';
import {
  esqlDocumentConditions,
  esqlFilterEvals,
  esqlLogConditions,
} from './overview_filters_esql';

/** The buckets of a trend over the time range, as many as the Overview's other charts draw. */
const TREND_BUCKETS = 50;

/** The columns of `vitalTrendQuery`'s rows. */
export const VITAL_TREND_COLUMNS = { time: 'time', p75: 'p75' } as const;

export interface VitalTrendQueryParams {
  serviceName: string;
  /** All environments when unset. */
  environment?: string;
  filters?: OverviewFilters;
}

/**
 * The environment as a `WHERE` condition, as the routes' `environmentFilter` reads it: either
 * environment field, or "Not defined" for APM's sentinel or neither; none for all environments.
 */
const environmentCondition = (environment: string | undefined): string | undefined => {
  if (!environment || environment === ENVIRONMENT_ALL_VALUE) {
    return undefined;
  }
  if (environment === ENVIRONMENT_NOT_DEFINED_VALUE) {
    return `(${SERVICE_ENVIRONMENT} == ${escapeStringValue(
      ENVIRONMENT_NOT_DEFINED_VALUE
    )} OR (${ENVIRONMENT_FIELDS.map((field) => `${field} IS NULL`).join(' AND ')}))`;
  }
  return `(${ENVIRONMENT_FIELDS.map(
    (field) => `${field} == ${escapeStringValue(environment)}`
  ).join(' OR ')})`;
};

/**
 * The p75 of one web vital per bucket of the time range, for a Lens chart: Lens keeps the time
 * range and the KQL query, and fills `?_tstart` and `?_tend`. The Overview's filters narrow the
 * vitals, the page included (EDOT Browser adds the page's route to every log), but the URL text,
 * as the web vitals carry no URL.
 */
export const vitalTrendQuery = (
  vital: CoreWebVital,
  { serviceName, environment, filters = {} }: VitalTrendQueryParams
): string => {
  const conditions = [
    `${TELEMETRY_SDK_LANGUAGE} == ${escapeStringValue(BROWSER_SDK_LANGUAGE)}`,
    `${SOURCE_SERVICE_NAME_FIELD} == ${escapeStringValue(serviceName)}`,
    `${SOURCE_EVENT_NAME_FIELD} == ${escapeStringValue(EVENT_WEB_VITAL)}`,
    // The SDK names the vitals in upper case, as the searches match it whatever its case.
    `TO_LOWER(${SOURCE_WEB_VITAL_NAME_FIELD}) == ${escapeStringValue(vital)}`,
    `${SOURCE_WEB_VITAL_VALUE_FIELD} IS NOT NULL`,
    environmentCondition(environment),
  ].filter((condition): condition is string => condition !== undefined);
  const filterEvals = esqlFilterEvals(filters);
  const documentConditions = [...esqlDocumentConditions(filters), ...esqlLogConditions(filters)];
  const { time, p75 } = VITAL_TREND_COLUMNS;

  return [
    // OTel attributes that some index doesn't map read as null instead of failing the query.
    'SET unmapped_fields = "NULLIFY";',
    `FROM ${OTEL_LOGS_INDEX}`,
    `| WHERE ${conditions.join(' AND ')}`,
    ...(filterEvals.length > 0 ? [`| EVAL ${filterEvals.join(', ')}`] : []),
    ...(documentConditions.length > 0 ? [`| WHERE ${documentConditions.join(' AND ')}`] : []),
    `| STATS ${p75} = PERCENTILE(${SOURCE_WEB_VITAL_VALUE_FIELD}, 75) BY ${time} = BUCKET(@timestamp, ${TREND_BUCKETS}, ?_tstart, ?_tend)`,
    `| SORT ${time}`,
  ].join('\n');
};
