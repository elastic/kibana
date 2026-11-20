/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOBILE_FIELDS, mobileDocumentsEsql } from '../../../../common/mobile_panel';
import type { EsqlQuery } from '../../../../common/mobile_panel';
import { MOBILE_SDK_NAMES } from '../../../../common/otel_data';
import { environmentsCommands, latestReleaseCommands } from '../../../lib/mobile/queries';
import { MAX_APPLICATIONS_PER_SOURCE } from '../constants';

/** Whether a `telemetry.sdk.name` is a mobile SDK; `java` and `swift` services are not. */
export const isMobileSdkName = (name: string | null | undefined): boolean =>
  (MOBILE_SDK_NAMES as readonly string[]).includes(name ?? '');

/**
 * Sessions, users, exceptions, platforms (by SDK name) and last seen per application, most sessions
 * first; a metric whose field no index maps is 0.
 */
export const applicationsQuery = (): EsqlQuery => ({
  query: mobileDocumentsEsql([
    `STATS sessions = COUNT_DISTINCT(${MOBILE_FIELDS.sessionId}),` +
      ` users = COUNT_DISTINCT(${MOBILE_FIELDS.installationId}),` +
      ` exceptions = COUNT(${MOBILE_FIELDS.exceptionType}),` +
      ` platforms = VALUES(${MOBILE_FIELDS.sdkName}),` +
      ` last_seen = MAX(@timestamp)` +
      ` BY ${MOBILE_FIELDS.serviceName}`,
    `SORT sessions DESC, ${MOBILE_FIELDS.serviceName} ASC`,
    `LIMIT ${MAX_APPLICATIONS_PER_SOURCE}`,
  ]),
  params: [],
});

/**
 * The latest release, the one with the most sessions, of each of `serviceNames` over the window
 * the query is run with.
 */
export const latestReleasesQuery = (serviceNames: string[]): EsqlQuery => {
  const names = serviceNames.map((serviceName, index) => ({
    name: `service_${index}`,
    value: serviceName,
  }));
  return {
    query: mobileDocumentsEsql([
      `WHERE ${MOBILE_FIELDS.serviceName} IN (${names.map(({ name }) => `?${name}`).join(', ')})`,
      ...latestReleaseCommands(),
      `LIMIT ${MAX_APPLICATIONS_PER_SOURCE}`,
    ]),
    params: names.map(({ name, value }) => ({ [name]: value })),
  };
};

/** Every environment of the mobile applications, for the picker. */
export const environmentsQuery = (): EsqlQuery => ({
  query: mobileDocumentsEsql(environmentsCommands()),
  params: [],
});
