/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_ALL_VALUE, ENVIRONMENT_NOT_DEFINED_VALUE } from '@kbn/apm-types';
import {
  MOBILE_SDK_NAMES,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
  attributeField,
  resourceAttributeField,
} from './otel_data';
import type { ComparedValue, MobilePlatform } from './types/applications';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The filters every mobile panel applies, besides the time range and the environment. */
export interface MobilePanelFilters {
  serviceName: string;
  platform?: MobilePlatform;
  /** A normalized release: its raw `service.version`s, with or without a build, match. */
  release?: string;
}

/** The `telemetry.sdk.name` of each platform; `os.name` isn't used, as iPads report `iPadOS`. */
export const SDK_NAME_BY_PLATFORM: Readonly<Record<MobilePlatform, string>> = {
  android: 'android',
  ios: 'iOS',
};

/** Hourly up to 24 hours, daily from there on (7 to 30 days in practice). */
export const getMobileTimeBucket = (startMs: number, endMs: number): 'hour' | 'day' =>
  endMs - startMs <= DAY_MS ? 'hour' : 'day';

/** The period of equal length that ends where `[start, end)` starts. */
export const getPreviousPeriod = (
  startMs: number,
  endMs: number
): { start: number; end: number } => ({ start: startMs - (endMs - startMs), end: startMs });

/** `current` against `previous`; the delta is missing when either is. */
export const toComparedValue = (
  current: number | null,
  previous: number | null
): ComparedValue => ({
  value: current,
  previous,
  delta: current !== null && previous !== null ? current - previous : null,
});

/** An ES|QL string literal: backslashes and quotes escaped, so a value can't end the string. */
export const esqlString = (value: string): string =>
  `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, ' ')}"`;

const SDK_NAME = resourceAttributeField('telemetry.sdk.name');
const SESSION_ID = attributeField('session.id');
const INSTALLATION_ID = resourceAttributeField('app.installation.id');
const EXCEPTION_TYPE = attributeField('exception.type');

/** The ES|QL `WHERE` conditions of the filters; the time range and environment are applied apart. */
export const mobilePanelConditions = ({
  serviceName,
  platform,
  release,
}: MobilePanelFilters): string[] => [
  `${SDK_NAME} IN (${MOBILE_SDK_NAMES.map(esqlString).join(', ')})`,
  `service.name == ${esqlString(serviceName)}`,
  ...(platform ? [`${SDK_NAME} == ${esqlString(SDK_NAME_BY_PLATFORM[platform])}`] : []),
  ...(release
    ? [
        `(service.version == ${esqlString(release)} OR STARTS_WITH(service.version, ${esqlString(
          `${release} (`
        )}) OR STARTS_WITH(service.version, ${esqlString(`${release}+`)}))`,
      ]
    : []),
];

/** The ES|QL of a mobile panel: its documents, filtered, then `commands` (e.g. a `STATS`). */
export const mobilePanelEsql = (filters: MobilePanelFilters, commands: string[] = []): string =>
  [
    `FROM ${OTEL_TRACES_INDEX},${OTEL_LOGS_INDEX}`,
    `WHERE ${mobilePanelConditions(filters).join(' AND ')}`,
    ...commands,
  ].join('\n| ');

/** What each KPI counts, over the filtered documents. */
export const MOBILE_KPI_STATS =
  `STATS docs = COUNT(*),` +
  ` sessions = COUNT_DISTINCT(${SESSION_ID}),` +
  ` users = COUNT_DISTINCT(${INSTALLATION_ID}),` +
  ` exceptions = COUNT(${EXCEPTION_TYPE})`;

const ENVIRONMENT_FIELDS = [
  'service.environment',
  'resource.attributes.deployment.environment.name',
];

/**
 * The ES|QL condition of the environment filter, as the routes apply it: either environment field,
 * or neither for "Not defined"; `undefined` for all environments.
 */
export const mobileEnvironmentCondition = (environment: string | undefined): string | undefined => {
  if (!environment || environment === ENVIRONMENT_ALL_VALUE) {
    return undefined;
  }
  if (environment === ENVIRONMENT_NOT_DEFINED_VALUE) {
    return `(${ENVIRONMENT_FIELDS.map((field) => `${field} IS NULL`).join(' AND ')})`;
  }
  return `(${ENVIRONMENT_FIELDS.map((field) => `${field} == ${esqlString(environment)}`).join(
    ' OR '
  )})`;
};

/**
 * The ES|QL that Discover opens for a panel: the KPI statistics over time, with every filter. The
 * routes apply the environment apart, so it is added here for Discover.
 */
export const mobilePanelDiscoverEsql = (
  filters: MobilePanelFilters,
  bucket: 'hour' | 'day',
  environment?: string
): string => {
  const environmentCondition = mobileEnvironmentCondition(environment);
  return mobilePanelEsql(filters, [
    ...(environmentCondition ? [`WHERE ${environmentCondition}`] : []),
    `STATS sessions = COUNT_DISTINCT(${SESSION_ID}),` +
      ` users = COUNT_DISTINCT(${INSTALLATION_ID}),` +
      ` exceptions = COUNT(${EXCEPTION_TYPE})` +
      ` BY bucket = BUCKET(@timestamp, 1 ${bucket})`,
    'SORT bucket ASC',
  ]);
};
