/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
  RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '@kbn/apm-types';
import { escapeStringValue } from '@kbn/esql-utils';
import {
  ENVIRONMENT_FIELDS,
  MOBILE_SDK_NAMES,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
  attributeField,
  resourceAttributeField,
} from './otel_data';
import type { ComparedValue, MobilePlatform } from './types/applications';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The OTel indices the mobile SDKs write to, alongside backend services. */
export const MOBILE_SOURCE_INDICES = `${OTEL_TRACES_INDEX},${OTEL_LOGS_INDEX}`;

/** The fields the mobile queries read, as stored in the OTel indices. */
export const MOBILE_FIELDS = {
  sdkName: resourceAttributeField('telemetry.sdk.name'),
  serviceName: SERVICE_NAME,
  serviceVersion: 'service.version',
  sessionId: attributeField('session.id'),
  installationId: resourceAttributeField('app.installation.id'),
  exceptionType: attributeField('exception.type'),
  environment: SERVICE_ENVIRONMENT,
  environmentName: RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
} as const;

/** Without these mapped there is no mobile data to read. */
export const MOBILE_REQUIRED_FIELDS: readonly string[] = [
  MOBILE_FIELDS.sdkName,
  MOBILE_FIELDS.serviceName,
];

/**
 * The fields some readable OTel index maps. ES|QL rejects a query that reads a field no index maps,
 * e.g. `exception.type` where no app ever threw, so the queries leave unmapped fields out.
 */
export type MappedFields = ReadonlySet<string>;

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

/** The platform of each `telemetry.sdk.name`, lower-cased. */
export const PLATFORM_BY_SDK_NAME: Readonly<Record<string, MobilePlatform>> = Object.fromEntries(
  Object.entries(SDK_NAME_BY_PLATFORM).map(([platform, sdkName]) => [
    sdkName.toLowerCase(),
    platform as MobilePlatform,
  ])
);

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

/** Mobile SDK documents: `telemetry.sdk.name`, as `telemetry.sdk.language` also matches backends. */
export const MOBILE_SDK_CONDITION = `${MOBILE_FIELDS.sdkName} IN (${MOBILE_SDK_NAMES.map(
  escapeStringValue
).join(', ')})`;

const releaseCondition = (release: string, mapped: MappedFields): string => {
  const { serviceVersion } = MOBILE_FIELDS;
  if (!mapped.has(serviceVersion)) {
    return 'false';
  }
  return (
    `(${serviceVersion} == ${escapeStringValue(release)}` +
    ` OR STARTS_WITH(${serviceVersion}, ${escapeStringValue(`${release} (`)})` +
    ` OR STARTS_WITH(${serviceVersion}, ${escapeStringValue(`${release}+`)}))`
  );
};

/** The ES|QL `WHERE` conditions of the filters; the time range and environment are applied apart. */
export const mobilePanelConditions = (
  { serviceName, platform, release }: MobilePanelFilters,
  mapped: MappedFields
): string[] => [
  MOBILE_SDK_CONDITION,
  `${MOBILE_FIELDS.serviceName} == ${escapeStringValue(serviceName)}`,
  ...(platform
    ? [`${MOBILE_FIELDS.sdkName} == ${escapeStringValue(SDK_NAME_BY_PLATFORM[platform])}`]
    : []),
  ...(release ? [releaseCondition(release, mapped)] : []),
];

/** The ES|QL of a mobile panel: its documents, filtered, then `commands` (e.g. a `STATS`). */
export const mobilePanelEsql = (
  filters: MobilePanelFilters,
  mapped: MappedFields,
  commands: string[] = []
): string =>
  [
    `FROM ${MOBILE_SOURCE_INDICES}`,
    `WHERE ${mobilePanelConditions(filters, mapped).join(' AND ')}`,
    ...commands,
  ].join('\n| ');

/** A statistic over one field, and its value when no index maps the field. */
export interface MobileMetric {
  name: string;
  aggregation: string;
  field: string;
  fallback: string;
}

export const SESSIONS_METRIC: MobileMetric = {
  name: 'sessions',
  aggregation: 'COUNT_DISTINCT',
  field: MOBILE_FIELDS.sessionId,
  fallback: '0',
};
export const USERS_METRIC: MobileMetric = {
  name: 'users',
  aggregation: 'COUNT_DISTINCT',
  field: MOBILE_FIELDS.installationId,
  fallback: '0',
};
export const EXCEPTIONS_METRIC: MobileMetric = {
  name: 'exceptions',
  aggregation: 'COUNT',
  field: MOBILE_FIELDS.exceptionType,
  fallback: '0',
};

/**
 * A `STATS` of the metrics (and `docs`, every document) by `by`, then an `EVAL` that sets each
 * metric whose field no index maps to its fallback.
 */
export const mobileStats = (
  metrics: readonly MobileMetric[],
  mapped: MappedFields,
  { extra = [], by }: { extra?: string[]; by?: string } = {}
): string[] => {
  const present = metrics.filter(({ field }) => mapped.has(field));
  const missing = metrics.filter(({ field }) => !mapped.has(field));
  const aggregations = [
    'docs = COUNT(*)',
    ...present.map(({ name, aggregation, field }) => `${name} = ${aggregation}(${field})`),
    ...extra,
  ];
  return [
    `STATS ${aggregations.join(', ')}${by ? ` BY ${by}` : ''}`,
    ...(missing.length > 0
      ? [`EVAL ${missing.map(({ name, fallback }) => `${name} = ${fallback}`).join(', ')}`]
      : []),
  ];
};

/** The environment fields some index maps, for an ES|QL `BY`. */
export const mappedEnvironmentFields = (mapped: MappedFields): string[] =>
  ENVIRONMENT_FIELDS.filter((field) => mapped.has(field));

/**
 * The ES|QL condition of the environment filter, as the routes apply it (`environmentFilter`):
 * either environment field, or "Not defined" for APM's sentinel or none of them;
 * `undefined` when it filters nothing.
 */
export const mobileEnvironmentCondition = (
  environment: string | undefined,
  mapped: MappedFields
): string | undefined => {
  if (!environment || environment === ENVIRONMENT_ALL_VALUE) {
    return undefined;
  }
  const fields = mappedEnvironmentFields(mapped);
  if (environment === ENVIRONMENT_NOT_DEFINED_VALUE) {
    if (fields.length === 0) {
      return undefined;
    }
    const sentinel = mapped.has(MOBILE_FIELDS.environment)
      ? [`${MOBILE_FIELDS.environment} == ${escapeStringValue(ENVIRONMENT_NOT_DEFINED_VALUE)}`]
      : [];
    const noEnvironment = `(${fields.map((field) => `${field} IS NULL`).join(' AND ')})`;
    return `(${[...sentinel, noEnvironment].join(' OR ')})`;
  }
  if (fields.length === 0) {
    return 'false';
  }
  return `(${fields.map((field) => `${field} == ${escapeStringValue(environment)}`).join(' OR ')})`;
};

/**
 * The ES|QL that Discover opens for a panel: the KPI statistics over time, with every filter. The
 * routes apply the environment apart, so it is added here for Discover.
 */
export const mobilePanelDiscoverEsql = (
  filters: MobilePanelFilters,
  mapped: MappedFields,
  { bucket, environment }: { bucket: 'hour' | 'day'; environment?: string }
): string => {
  const environmentCondition = mobileEnvironmentCondition(environment, mapped);
  return mobilePanelEsql(filters, mapped, [
    ...(environmentCondition ? [`WHERE ${environmentCondition}`] : []),
    ...mobileStats([SESSIONS_METRIC, USERS_METRIC, EXCEPTIONS_METRIC], mapped, {
      by: `bucket = BUCKET(@timestamp, 1 ${bucket})`,
    }),
    'SORT bucket ASC',
  ]);
};
