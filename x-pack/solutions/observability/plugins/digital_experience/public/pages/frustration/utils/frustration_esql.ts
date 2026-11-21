/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_ALL_VALUE, ENVIRONMENT_NOT_DEFINED_VALUE } from '@kbn/apm-types';
import {
  EVENT_DEAD_CLICK,
  EVENT_ERROR_CLICK,
  EVENT_RAGE_CLICK,
  FRUSTRATION_EVENTS,
  OTEL_LOGS_INDEX,
} from '../../../../common/otel_data';
import {
  DEVICE_DESKTOP_LABEL,
  DEVICE_MOBILE_LABEL,
  SOURCE_APP_VERSION_FIELDS,
  SOURCE_EVENT_NAME_FIELD,
  SOURCE_EXCEPTION_MESSAGE_FIELD,
  SOURCE_EXCEPTION_TYPE_FIELD,
  SOURCE_MOBILE_FIELDS,
  SOURCE_SERVICE_NAME_FIELD,
  SOURCE_SESSION_ID_FIELD,
} from '../../../../common/otel_source_fields';
import { SESSION_ATTRIBUTE_FIELDS } from '../../../../common/session_attribute_fields';

/** The application and environment the dashboard shows; the time range comes from the dashboard. */
export interface FrustrationQueryParams {
  serviceName: string;
  environment: string;
}

type FrustrationEvent = (typeof FRUSTRATION_EVENTS)[number];

const TOP_VERSIONS = 10;
const TOP_BROWSERS = 5;
const TOP_DEVICES = 5;
const ERROR_CLICK_ROWS = 20;
const TIME_BUCKETS = 50;

// OTel attributes that some index doesn't map read as null instead of failing the query.
const NULLIFY_UNMAPPED_FIELDS = 'SET unmapped_fields = "NULLIFY";';

/** `value` as the text of an ES|QL string literal: backslashes, quotes and line breaks escaped. */
export const escapeEsqlString = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');

const literal = (value: string): string => `"${escapeEsqlString(value)}"`;

const eventList = FRUSTRATION_EVENTS.map(literal).join(', ');

// One column per type, so a chart stacks them and each value of a dimension is one row.
const TYPE_COLUMNS: ReadonlyArray<readonly [string, FrustrationEvent]> = [
  ['rage', EVENT_RAGE_CLICK],
  ['dead', EVENT_DEAD_CLICK],
  ['error', EVENT_ERROR_CLICK],
];
const SIGNALS_BY_TYPE = `${TYPE_COLUMNS.map(
  ([column, event]) => `${column} = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} == ${literal(event)}`
).join(', ')}, signals = COUNT(*)`;

const ENVIRONMENT_FIELDS = SESSION_ATTRIBUTE_FIELDS.environment;

/**
 * Nothing for all environments. No environment means every environment field is unset: OTel data
 * doesn't carry APM's "Not defined" value, which the server's `environmentFilter` also matches.
 */
const environmentClause = (environment: string): string => {
  if (!environment || environment === ENVIRONMENT_ALL_VALUE) {
    return '';
  }
  if (environment === ENVIRONMENT_NOT_DEFINED_VALUE) {
    return `\n  AND (${ENVIRONMENT_FIELDS.map((field) => `${field} IS NULL`).join(' AND ')})`;
  }
  return `\n  AND (${ENVIRONMENT_FIELDS.map((field) => `${field} == ${literal(environment)}`).join(
    ' OR '
  )})`;
};

/** The events of the service and environment: all of the application's sessions. */
const applicationEvents = ({ serviceName, environment }: FrustrationQueryParams): string =>
  `${NULLIFY_UNMAPPED_FIELDS}
FROM ${OTEL_LOGS_INDEX}
| WHERE ${SOURCE_SERVICE_NAME_FIELD} == ${literal(serviceName)}${environmentClause(environment)}`;

/** The frustration events of the service and environment, which every panel but one counts. */
export const frustrationBase = (params: FrustrationQueryParams): string =>
  `${applicationEvents(params)}
  AND ${SOURCE_EVENT_NAME_FIELD} IN (${eventList})`;

const firstOf = (fields: readonly string[]): string => `COALESCE(${fields.join(', ')})`;

/** The signals, in one row. */
export const signalsQuery = (params: FrustrationQueryParams): string =>
  `${frustrationBase(params)}
| STATS signals = COUNT(*)`;

/** The share of the application's sessions with a frustration signal, with both counts. */
export const frustratedSessionsQuery = (params: FrustrationQueryParams): string =>
  `${applicationEvents(params)}
| STATS frustrated = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}) WHERE ${SOURCE_EVENT_NAME_FIELD} IN (${eventList}),
        sessions = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD})
| EVAL share = CASE(sessions > 0, TO_DOUBLE(frustrated) / sessions, 0.0)`;

/** The signals of one type, in one row. */
export const signalsOfTypeQuery = (
  params: FrustrationQueryParams,
  event: FrustrationEvent
): string =>
  `${applicationEvents(params)}
  AND ${SOURCE_EVENT_NAME_FIELD} == ${literal(event)}
| STATS signals = COUNT(*)`;

/** The signals of each type per bucket of the dashboard's time range. */
export const signalsOverTimeQuery = (params: FrustrationQueryParams): string =>
  `${frustrationBase(params)}
| STATS ${SIGNALS_BY_TYPE} BY time = BUCKET(@timestamp, ${TIME_BUCKETS}, ?_tstart, ?_tend)
| SORT time`;

/** The signals of each type of the `top` most affected values of an expression, a row each. */
const signalsByDimensionQuery = (
  params: FrustrationQueryParams,
  column: string,
  expression: string,
  top: number,
  preEvals: readonly string[] = []
): string =>
  `${frustrationBase(params)}
| EVAL ${[...preEvals, `${column} = ${expression}`].join(', ')}
| WHERE ${column} IS NOT NULL
| STATS ${SIGNALS_BY_TYPE} BY ${column}
| SORT signals DESC, ${column}
| LIMIT ${top}`;

/** The signals of each type of the most affected application versions. */
export const signalsByVersionQuery = (params: FrustrationQueryParams): string =>
  signalsByDimensionQuery(params, 'version', firstOf(SOURCE_APP_VERSION_FIELDS), TOP_VERSIONS);

/** The signals of each type of the most affected browsers. */
export const signalsByBrowserQuery = (params: FrustrationQueryParams): string =>
  signalsByDimensionQuery(
    params,
    'browser',
    firstOf(SESSION_ATTRIBUTE_FIELDS.browser),
    TOP_BROWSERS
  );

/**
 * The signals of each type of the most affected devices: the device model or type, else "Mobile"
 * or "Desktop" from `browser.mobile`, as the Overview's device filter reads it.
 */
export const signalsByDeviceQuery = (params: FrustrationQueryParams): string =>
  signalsByDimensionQuery(
    params,
    'device',
    `COALESCE(${[
      ...SESSION_ATTRIBUTE_FIELDS.device,
      `CASE(mobile == "true", ${literal(DEVICE_MOBILE_LABEL)}, mobile == "false", ${literal(
        DEVICE_DESKTOP_LABEL
      )})`,
    ].join(', ')})`,
    TOP_DEVICES,
    [`mobile = COALESCE(${SOURCE_MOBILE_FIELDS.map((field) => `TO_STRING(${field})`).join(', ')})`]
  );

/** The most frequent error click exceptions, with their signals and sessions. */
export const errorClicksQuery = (params: FrustrationQueryParams): string =>
  `${applicationEvents(params)}
  AND ${SOURCE_EVENT_NAME_FIELD} == ${literal(EVENT_ERROR_CLICK)}
| STATS signals = COUNT(*), sessions = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}) BY type = ${SOURCE_EXCEPTION_TYPE_FIELD}, message = ${SOURCE_EXCEPTION_MESSAGE_FIELD}
| SORT signals DESC
| LIMIT ${ERROR_CLICK_ROWS}`;
