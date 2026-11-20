/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, esql, type ComposerQuery } from '@elastic/esql';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
  RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TELEMETRY_SDK_LANGUAGE,
  TELEMETRY_SDK_NAME,
} from '@kbn/apm-types';
import { MOBILE_PLATFORM } from './application_source';
import {
  BROWSER_SDK_LANGUAGE,
  ELASTIC_DISTRO_NAME,
  MOBILE_SDK_NAMES,
  MOBILE_SDK_NAME_BY_PLATFORM,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
  attributeField,
  resourceAttributeField,
} from './otel_data';
import type { ComparedValue, MobilePlatform } from './types/applications';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The fields the mobile queries read, as stored in the OTel indices. */
export const MOBILE_FIELDS = {
  distroName: resourceAttributeField('telemetry.distro.name'),
  osName: resourceAttributeField('os.name'),
  sdkLanguage: TELEMETRY_SDK_LANGUAGE,
  sdkName: TELEMETRY_SDK_NAME,
  serviceName: SERVICE_NAME,
  serviceVersion: 'service.version',
  sessionId: attributeField('session.id'),
  installationId: resourceAttributeField('app.installation.id'),
  exceptionType: attributeField('exception.type'),
  environment: SERVICE_ENVIRONMENT,
  environmentName: RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
} as const;

/** A mobile field as an ES|QL column. */
export const mobileColumn = (field: keyof typeof MOBILE_FIELDS) => esql.col(MOBILE_FIELDS[field]);

/** The filters every mobile panel applies, besides the time range and the environment. */
export interface MobilePanelFilters {
  serviceName: string;
  /** A resource `os.name` as the SDKs send it, e.g. `iPadOS`. */
  osName?: string;
  /** A release, as the SDKs send it in `service.version`; the build is in `app.build_id`. */
  release?: string;
}

/**
 * The resource `os.name` of each platform. Not `os.type`, which can't tell them apart (Android
 * sends `linux`, iOS `darwin`).
 */
export const OS_NAMES_BY_PLATFORM: Readonly<Record<MobilePlatform, readonly string[]>> = {
  android: ['Android'],
  ios: ['iOS', 'iPadOS'],
};

const MOBILE_OS_NAMES = Object.values(OS_NAMES_BY_PLATFORM).flat();

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

/** `field IN (values)`, the values as escaped string literals. */
export const inValues = (field: keyof typeof MOBILE_FIELDS, values: readonly string[]) =>
  Builder.expression.func.binary('in', [
    mobileColumn(field),
    Builder.expression.list.tuple({
      values: values.map((value) => Builder.expression.literal.string(value)),
    }),
  ]);

/**
 * The EDOT Android and iOS documents of the OTel indices, each with its `platform`: a mobile
 * `telemetry.sdk.name`, or, once the SDKs send the upstream values, the Elastic distribution on a
 * mobile `os.name`. EDOT Browser is an Elastic distribution too, and reports the device's OS (e.g.
 * `iOS` on an iPhone), so its `webjs` documents are left out. Fields no index maps read as `null`
 * instead of failing the query, e.g. `exception.type` where no app ever threw.
 */
export const mobileDocuments = (): ComposerQuery =>
  esql.from(OTEL_TRACES_INDEX, OTEL_LOGS_INDEX).addSetCommand('unmapped_fields', 'nullify')
    .pipe`WHERE ${inValues('sdkName', MOBILE_SDK_NAMES)} OR (${mobileColumn(
    'distroName'
  )} == ${ELASTIC_DISTRO_NAME} AND ${inValues('osName', MOBILE_OS_NAMES)})`
    .pipe`WHERE COALESCE(${mobileColumn('sdkLanguage')}, "") != ${BROWSER_SDK_LANGUAGE}`
    .pipe`EVAL platform = CASE(${inValues(
    'osName',
    OS_NAMES_BY_PLATFORM.android
  )} OR ${mobileColumn('sdkName')} == ${MOBILE_SDK_NAME_BY_PLATFORM.android}, ${
    MOBILE_PLATFORM.android
  }, ${MOBILE_PLATFORM.ios})`;

/**
 * The documents of a mobile panel, filtered; the time range and environment are applied apart.
 * Values from the request are params, which `inlineParams` writes into the query for Discover.
 */
export const mobilePanelQuery = ({ serviceName, osName, release }: MobilePanelFilters) => {
  let query = mobileDocuments().pipe`WHERE ${mobileColumn('serviceName')} == ${{
    service_name: serviceName,
  }}`;
  if (osName) {
    query = query.pipe`WHERE ${mobileColumn('osName')} == ${{ os_name: osName }}`;
  }
  if (release) {
    query = query.pipe`WHERE ${mobileColumn('serviceVersion')} == ${{ release }}`;
  }
  return query;
};

/** Sessions, users and exceptions; an unmapped field counts 0. */
export const withKpiStats = (query: ComposerQuery): ComposerQuery =>
  query.pipe`STATS docs = COUNT(*),
    sessions = COUNT_DISTINCT(${mobileColumn('sessionId')}),
    users = COUNT_DISTINCT(${mobileColumn('installationId')}),
    exceptions = COUNT(${mobileColumn('exceptionType')})`;

/**
 * The documents in `environment`, as the routes' `environmentFilter` keeps them: either
 * environment field, or "Not defined" for APM's sentinel or neither; all for all environments.
 */
export const withEnvironment = (
  query: ComposerQuery,
  environment: string | undefined
): ComposerQuery => {
  if (!environment || environment === ENVIRONMENT_ALL_VALUE) {
    return query;
  }
  const environmentColumn = mobileColumn('environment');
  const environmentNameColumn = mobileColumn('environmentName');
  if (environment === ENVIRONMENT_NOT_DEFINED_VALUE) {
    return query.pipe`WHERE ${environmentColumn} == ${ENVIRONMENT_NOT_DEFINED_VALUE}
      OR (${environmentColumn} IS NULL AND ${environmentNameColumn} IS NULL)`;
  }
  return query.pipe`WHERE ${environmentColumn} == ${environment}
    OR ${environmentNameColumn} == ${environment}`;
};

/**
 * The ES|QL that Discover opens for a panel: the KPI statistics over time with every filter, the
 * environment included, and the values written into the text, as Discover takes no params.
 */
export const mobilePanelDiscoverEsql = (
  filters: MobilePanelFilters,
  { bucket, environment }: { bucket: 'hour' | 'day'; environment?: string }
): string => {
  const query = withEnvironment(mobilePanelQuery(filters), environment);
  const sessions = mobileColumn('sessionId');
  const users = mobileColumn('installationId');
  const exceptions = mobileColumn('exceptionType');
  // The bucket's unit is a keyword, not a value, so each has its own template.
  const bucketed =
    bucket === 'hour'
      ? query.pipe`STATS sessions = COUNT_DISTINCT(${sessions}), users = COUNT_DISTINCT(${users}),
          exceptions = COUNT(${exceptions}) BY bucket = BUCKET(@timestamp, 1 hour)`
      : query.pipe`STATS sessions = COUNT_DISTINCT(${sessions}), users = COUNT_DISTINCT(${users}),
          exceptions = COUNT(${exceptions}) BY bucket = BUCKET(@timestamp, 1 day)`;
  return bucketed.pipe`SORT bucket ASC`.inlineParams().print('pipe-multiline');
};
