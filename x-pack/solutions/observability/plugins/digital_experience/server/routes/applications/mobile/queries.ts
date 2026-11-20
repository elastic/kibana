/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXCEPTIONS_METRIC,
  MOBILE_FIELDS,
  MOBILE_SDK_CONDITION,
  MOBILE_SOURCE_INDICES,
  SESSIONS_METRIC,
  USERS_METRIC,
  mobileStats,
} from '../../../../common/mobile_panel';
import type { MappedFields } from '../../../../common/mobile_panel';
import { MOBILE_SDK_NAMES } from '../../../../common/otel_data';
import { environmentsCommands, releasesCommands } from '../../../lib/mobile/queries';
import { MAX_APPLICATIONS_PER_SOURCE } from '../constants';

/** Whether a `telemetry.sdk.name` is a mobile SDK; `java` and `swift` services are not. */
export const isMobileSdkName = (name: string | null | undefined): boolean =>
  (MOBILE_SDK_NAMES as readonly string[]).includes(name ?? '');

const mobileDocuments = (commands: string[]): string =>
  [`FROM ${MOBILE_SOURCE_INDICES}`, `WHERE ${MOBILE_SDK_CONDITION}`, ...commands].join('\n| ');

/**
 * Sessions, users, exceptions, platforms (by SDK name) and last seen per application, most sessions
 * first; a metric whose field no index maps is 0.
 */
export const applicationsQuery = (mapped: MappedFields): string =>
  mobileDocuments([
    ...mobileStats([SESSIONS_METRIC, USERS_METRIC, EXCEPTIONS_METRIC], mapped, {
      extra: [`platforms = VALUES(${MOBILE_FIELDS.sdkName})`, 'last_seen = MAX(@timestamp)'],
      by: MOBILE_FIELDS.serviceName,
    }),
    `SORT sessions DESC, ${MOBILE_FIELDS.serviceName} ASC`,
    `LIMIT ${MAX_APPLICATIONS_PER_SOURCE}`,
  ]);

/**
 * Sessions per application and raw version over the window the query is run with; `undefined`
 * when no index maps `service.version`.
 */
export const releasesQuery = (mapped: MappedFields): string | undefined => {
  const commands = releasesCommands(mapped, {
    by: [MOBILE_FIELDS.serviceName],
    limit: MAX_APPLICATIONS_PER_SOURCE * 10,
  });
  return commands ? mobileDocuments(commands) : undefined;
};

/** Every environment of the mobile applications, for the picker. */
export const environmentsQuery = (mapped: MappedFields): string =>
  mobileDocuments(environmentsCommands(mapped));
