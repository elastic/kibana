/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, esql } from '@elastic/esql';
import {
  EXCEPTION_TYPE,
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
  OS_NAME,
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
  environment: SERVICE_ENVIRONMENT,
  environmentName: RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
} as const;

/** A field the mobile queries read, as an ES|QL column. */
export const mobileColumn = (field: keyof typeof MOBILE_FIELDS) => esql.col(MOBILE_FIELDS[field]);

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
  osName: 'os_name',
  bucket: 'bucket',
} as const;

/** A column the mobile queries compute, as an ES|QL column. */
export const resultColumn = (column: keyof typeof RESULT_COLUMNS) =>
  esql.col(RESULT_COLUMNS[column]);

/** `field IN (values)`, the values as escaped string literals. */
export const inValues = (field: keyof typeof MOBILE_FIELDS, values: readonly string[]) =>
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
