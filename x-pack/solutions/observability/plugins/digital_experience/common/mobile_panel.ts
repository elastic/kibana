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

/**
 * Fields no index maps read as `null` instead of failing the query, e.g. `exception.type` where no
 * app ever threw, or every field on a cluster without mobile data.
 */
export const NULLIFY_UNMAPPED_FIELDS = 'SET unmapped_fields = "NULLIFY";';

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

/** An ES|QL query and the values of its `?name` params. */
export interface EsqlQuery {
  query: string;
  params: Array<Record<string, string>>;
}

/**
 * How a query writes a value: as a `?name` param for the routes, or as an escaped literal for
 * Discover, which takes the query text only.
 */
export interface EsqlValues {
  text: (name: string, value: string) => string;
}

/** Values written into the query, for Discover. */
export const INLINE_VALUES: EsqlValues = { text: (_name, value) => escapeStringValue(value) };

/** Values sent as params, which `params` collects for the request. */
export const createParamValues = (): EsqlValues & { params: EsqlQuery['params'] } => {
  const params: EsqlQuery['params'] = [];
  return {
    params,
    text: (name, value) => {
      params.push({ [name]: value });
      return `?${name}`;
    },
  };
};

/** The filters every mobile panel applies, besides the time range and the environment. */
export interface MobilePanelFilters {
  serviceName: string;
  platform?: MobilePlatform;
  /** A release, as the SDKs send it in `service.version`; the build is in `app.build_id`. */
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

/** The mobile documents, then `commands`. */
export const mobileDocumentsEsql = (commands: string[]): string =>
  `${NULLIFY_UNMAPPED_FIELDS}\n${[
    `FROM ${MOBILE_SOURCE_INDICES}`,
    `WHERE ${MOBILE_SDK_CONDITION}`,
    ...commands,
  ].join('\n| ')}`;

/** The ES|QL `WHERE` conditions of the filters; the time range and environment are applied apart. */
export const mobilePanelConditions = (
  { serviceName, platform, release }: MobilePanelFilters,
  values: EsqlValues
): string[] => [
  `${MOBILE_FIELDS.serviceName} == ${values.text('service_name', serviceName)}`,
  ...(platform
    ? [`${MOBILE_FIELDS.sdkName} == ${escapeStringValue(SDK_NAME_BY_PLATFORM[platform])}`]
    : []),
  ...(release ? [`${MOBILE_FIELDS.serviceVersion} == ${values.text('release', release)}`] : []),
];

/** The ES|QL of a mobile panel: its documents, filtered, then `commands` (e.g. a `STATS`). */
export const mobilePanelEsql = (
  filters: MobilePanelFilters,
  values: EsqlValues,
  commands: string[] = []
): string =>
  mobileDocumentsEsql([
    `WHERE ${mobilePanelConditions(filters, values).join(' AND ')}`,
    ...commands,
  ]);

/** Sessions, users and exceptions; an unmapped field counts 0. */
export const MOBILE_KPI_STATS =
  `STATS docs = COUNT(*),` +
  ` sessions = COUNT_DISTINCT(${MOBILE_FIELDS.sessionId}),` +
  ` users = COUNT_DISTINCT(${MOBILE_FIELDS.installationId}),` +
  ` exceptions = COUNT(${MOBILE_FIELDS.exceptionType})`;

/**
 * The ES|QL condition of the environment filter, as the routes apply it (`environmentFilter`):
 * either environment field, or "Not defined" for APM's sentinel or none of them;
 * `undefined` when it filters nothing.
 */
export const mobileEnvironmentCondition = (
  environment: string | undefined,
  values: EsqlValues
): string | undefined => {
  if (!environment || environment === ENVIRONMENT_ALL_VALUE) {
    return undefined;
  }
  if (environment === ENVIRONMENT_NOT_DEFINED_VALUE) {
    const sentinel = `${MOBILE_FIELDS.environment} == ${escapeStringValue(
      ENVIRONMENT_NOT_DEFINED_VALUE
    )}`;
    const noEnvironment = ENVIRONMENT_FIELDS.map((field) => `${field} IS NULL`).join(' AND ');
    return `(${sentinel} OR (${noEnvironment}))`;
  }
  const value = values.text('environment', environment);
  return `(${ENVIRONMENT_FIELDS.map((field) => `${field} == ${value}`).join(' OR ')})`;
};

/**
 * The ES|QL that Discover opens for a panel: the KPI statistics over time, with every filter,
 * the environment included as the routes apply it apart.
 */
export const mobilePanelDiscoverEsql = (
  filters: MobilePanelFilters,
  { bucket, environment }: { bucket: 'hour' | 'day'; environment?: string }
): string => {
  const environmentCondition = mobileEnvironmentCondition(environment, INLINE_VALUES);
  return mobilePanelEsql(filters, INLINE_VALUES, [
    ...(environmentCondition ? [`WHERE ${environmentCondition}`] : []),
    `STATS sessions = COUNT_DISTINCT(${MOBILE_FIELDS.sessionId}),` +
      ` users = COUNT_DISTINCT(${MOBILE_FIELDS.installationId}),` +
      ` exceptions = COUNT(${MOBILE_FIELDS.exceptionType})` +
      ` BY bucket = BUCKET(@timestamp, 1 ${bucket})`,
    'SORT bucket ASC',
  ]);
};
