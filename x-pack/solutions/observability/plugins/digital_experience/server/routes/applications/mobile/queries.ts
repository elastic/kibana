/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MOBILE_SDK_NAMES,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
  attributeField,
  resourceAttributeField,
} from '../../../../common/otel_data';
import { MAX_APPLICATIONS_PER_SOURCE } from '../constants';

export const MOBILE_SOURCE_INDICES = `${OTEL_TRACES_INDEX},${OTEL_LOGS_INDEX}`;

const SDK_NAME = resourceAttributeField('telemetry.sdk.name');
const SESSION_ID = attributeField('session.id');
const INSTALLATION_ID = resourceAttributeField('app.installation.id');
const EXCEPTION_TYPE = attributeField('exception.type');

/** Whether a `telemetry.sdk.name` is a mobile SDK; `java` and `swift` services are not. */
export const isMobileSdkName = (name: string | null | undefined): boolean =>
  (MOBILE_SDK_NAMES as readonly string[]).includes(name ?? '');

const mobileSdkFilter = `${SDK_NAME} IN (${MOBILE_SDK_NAMES.map((name) => `"${name}"`).join(
  ', '
)})`;

/**
 * Sessions, users, exceptions, platforms (by SDK name) and last seen per application, most sessions
 * first.
 */
export const applicationsQuery = (): string =>
  [
    `FROM ${MOBILE_SOURCE_INDICES}`,
    `WHERE ${mobileSdkFilter}`,
    `STATS sessions = COUNT_DISTINCT(${SESSION_ID}),` +
      ` users = COUNT_DISTINCT(${INSTALLATION_ID}),` +
      ` exceptions = COUNT(${EXCEPTION_TYPE}),` +
      ` platforms = VALUES(${SDK_NAME}),` +
      ` last_seen = MAX(@timestamp)` +
      ` BY service.name`,
    `SORT sessions DESC, service.name ASC`,
    `LIMIT ${MAX_APPLICATIONS_PER_SOURCE}`,
  ].join('\n| ');

/** Sessions per application and raw version over the window the query is run with. */
export const releasesQuery = (): string =>
  [
    `FROM ${MOBILE_SOURCE_INDICES}`,
    `WHERE ${mobileSdkFilter}`,
    `STATS sessions = COUNT_DISTINCT(${SESSION_ID}) BY service.name, service.version`,
    `LIMIT ${MAX_APPLICATIONS_PER_SOURCE * 10}`,
  ].join('\n| ');

/** Every environment of the mobile applications, for the picker. */
export const environmentsQuery = (): string =>
  [
    `FROM ${MOBILE_SOURCE_INDICES}`,
    `WHERE ${mobileSdkFilter}`,
    `STATS docs = COUNT(*) BY service.environment`,
    `SORT docs DESC`,
    `LIMIT 100`,
  ].join('\n| ');
