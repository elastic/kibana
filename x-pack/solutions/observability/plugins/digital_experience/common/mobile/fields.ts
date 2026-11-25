/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, esql } from '@elastic/esql';
import type { ESQLBinaryExpression, ESQLColumn } from '@elastic/esql/types';
import {
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  HTTP_REQUEST_METHOD,
  HTTP_RESPONSE_STATUS_CODE,
  KIND,
  OTEL_EVENT_NAME,
  RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SERVICE_VERSION,
  SESSION_ID,
  TELEMETRY_SDK_LANGUAGE,
  TELEMETRY_SDK_NAME,
} from '@kbn/apm-types';
import {
  APP_INSTALLATION_ID,
  APP_SCREEN_NAME,
  APP_WIDGET_ID,
  APP_WIDGET_NAME,
  EXCEPTION_STACKTRACE,
  OS_NAME,
  OTEL_LOG_BODY,
  OTEL_OBSERVED_TIMESTAMP,
  OTEL_SCOPE_NAME,
  OTEL_SEVERITY_TEXT,
  OTEL_SPAN_DURATION,
  OTEL_SPAN_NAME,
  TELEMETRY_DISTRO_NAME,
  attributeField,
  resourceAttributeField,
} from '../otel_data';
import type { MobilePlatform } from '../types/applications';

/** The fields the mobile queries read, as stored in the OTel indices. */
export const MOBILE_FIELDS = {
  distroName: resourceAttributeField(TELEMETRY_DISTRO_NAME),
  osName: resourceAttributeField(OS_NAME),
  sdkLanguage: TELEMETRY_SDK_LANGUAGE,
  sdkName: TELEMETRY_SDK_NAME,
  serviceName: SERVICE_NAME,
  /** The release, as the SDKs send it; the build is in `app.build_id`. */
  serviceVersion: SERVICE_VERSION,
  sessionId: attributeField(SESSION_ID),
  /** One per install of the app, so it counts users. */
  installationId: resourceAttributeField(APP_INSTALLATION_ID),
  exceptionType: attributeField(EXCEPTION_TYPE),
  exceptionMessage: attributeField(EXCEPTION_MESSAGE),
  exceptionStacktrace: attributeField(EXCEPTION_STACKTRACE),
  /** A crash's group, once ingest stores one; no SDK or pipeline writes it yet. */
  exceptionFingerprint: attributeField('exception.fingerprint'),
  eventName: OTEL_EVENT_NAME,
  /** When the SDK observed a log record: EDOT iOS sets only this one to a crash's time. */
  observedTimestamp: OTEL_OBSERVED_TIMESTAMP,
  osVersion: resourceAttributeField('os.version'),
  /** EDOT iOS sends the marketing name, EDOT Android only the identifier, e.g. `Pixel 8`. */
  deviceModelName: resourceAttributeField('device.model.name'),
  deviceModelIdentifier: resourceAttributeField('device.model.identifier'),
  spanKind: KIND,
  spanName: OTEL_SPAN_NAME,
  spanDuration: OTEL_SPAN_DURATION,
  scopeName: OTEL_SCOPE_NAME,
  httpMethod: attributeField(HTTP_REQUEST_METHOD),
  httpStatusCode: attributeField(HTTP_RESPONSE_STATUS_CODE),
  urlFull: attributeField('url.full'),
  screenName: attributeField(APP_SCREEN_NAME),
  widgetName: attributeField(APP_WIDGET_NAME),
  widgetId: attributeField(APP_WIDGET_ID),
  logBody: OTEL_LOG_BODY,
  severity: OTEL_SEVERITY_TEXT,
  environment: SERVICE_ENVIRONMENT,
  environmentName: RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
} as const;

/** A field the mobile queries read, as an ES|QL column. */
export const mobileColumn = (field: keyof typeof MOBILE_FIELDS): ESQLColumn =>
  esql.col(MOBILE_FIELDS[field]);

/**
 * The columns the mobile queries compute, which their row types are keyed on, so a rename here
 * fails the type check where a row is read.
 */
export const RESULT_COLUMNS = {
  platform: 'platform',
  platforms: 'platforms',
  docs: 'docs',
  sessions: 'sessions',
  users: 'users',
  exceptions: 'exceptions',
  lastSeen: 'last_seen',
  release: 'release',
  latestRelease: 'latest_release',
  numericRelease: 'numeric_release',
  newestRelease: 'newest_release',
  firstSeen: 'first_seen',
  lastFirstSeen: 'last_first_seen',
  releaseGroup: 'release_group',
  bucket: 'bucket',
  osName: 'os_name',
  environments: 'environments',
  environmentNames: 'environment_names',
  crashTime: 'crash_time',
  fingerprint: 'fingerprint',
  events: 'events',
  exceptionType: 'exception_type',
  message: 'message',
  firstRelease: 'first_release',
  lastRelease: 'last_release',
  releases: 'releases',
  value: 'value',
  count: 'count',
  stacktrace: 'stacktrace',
  sessionId: 'session_id',
  eventKind: 'event_kind',
  name: 'name',
  detail: 'detail',
  statusCode: 'status_code',
  durationMs: 'duration_ms',
  page: 'page',
  traceId: 'trace_id',
  spanId: 'span_id',
} as const;

/** A column the mobile queries compute, as an ES|QL column. */
export const resultColumn = (column: keyof typeof RESULT_COLUMNS): ESQLColumn =>
  esql.col(RESULT_COLUMNS[column]);

/** `field IN (values)`, the values as escaped string literals. */
export const inValues = (
  field: keyof typeof MOBILE_FIELDS,
  values: readonly string[]
): ESQLBinaryExpression =>
  Builder.expression.func.binary('in', [
    mobileColumn(field),
    Builder.expression.list.tuple({
      values: values.map((value) => Builder.expression.literal.string(value)),
    }),
  ]);

/**
 * The resource `os.name` of each platform. Not `os.type`, which can't tell them apart (Android
 * sends `linux`, iOS `darwin`).
 */
export const OS_NAMES_BY_PLATFORM: Readonly<Record<MobilePlatform, readonly string[]>> = {
  android: ['Android'],
  ios: ['iOS', 'iPadOS'],
};

export const MOBILE_OS_NAMES = Object.values(OS_NAMES_BY_PLATFORM).flat();
