/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_ALERTS_INDEX,
  DEFAULT_LOGS_INDEX_PATTERN,
  THREAT_REPORTS_INDEX_PATTERN,
} from './constants';
import { getIocEsqlFields } from './ioc_field_map';

/** Escape a value for use inside a double-quoted ES|QL string literal. */
export const escapeEsqlString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

export const getAlertsIndex = (spaceId: string): string => `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

const quoteEsqlIdentifier = (identifier: string): string => `"${escapeEsqlString(identifier)}"`;

const buildFieldEqualityWhere = (fields: readonly string[], value: string): string => {
  const escapedValue = escapeEsqlString(value);
  return fields.map((field) => `${field} == "${escapedValue}"`).join(' OR ');
};

export const buildEventLookupEsql = ({
  index,
  eventId,
}: {
  index: string;
  eventId: string;
}): string => {
  const escapedEventId = escapeEsqlString(eventId);
  return `FROM ${quoteEsqlIdentifier(index)} | WHERE event.id == "${escapedEventId}" OR _id == "${escapedEventId}"`;
};

export const buildAlertLookupEsql = ({
  spaceId,
  alertId,
}: {
  spaceId: string;
  alertId: string;
}): string => {
  const escapedAlertId = escapeEsqlString(alertId);
  return `FROM ${quoteEsqlIdentifier(getAlertsIndex(spaceId))} | WHERE kibana.alert.uuid == "${escapedAlertId}" OR _id == "${escapedAlertId}"`;
};

export const buildThreatReportLookupEsql = ({ reportId }: { reportId: string }): string => {
  const escapedReportId = escapeEsqlString(reportId);
  return `FROM ${quoteEsqlIdentifier(THREAT_REPORTS_INDEX_PATTERN)} | WHERE _id == "${escapedReportId}"`;
};

export const buildThreatReportsInEsql = ({
  reportIds,
}: {
  reportIds: string[];
}): string | undefined => {
  const uniqueReportIds = [...new Set(reportIds)];
  if (uniqueReportIds.length === 0) {
    return undefined;
  }

  const quotedIds = uniqueReportIds.map((reportId) => `"${escapeEsqlString(reportId)}"`).join(', ');
  return `FROM ${quoteEsqlIdentifier(THREAT_REPORTS_INDEX_PATTERN)} | WHERE _id IN (${quotedIds})`;
};

export const buildIocLookupEsql = ({
  type,
  value,
  indexPattern = DEFAULT_LOGS_INDEX_PATTERN,
}: {
  type: string;
  value: string;
  indexPattern?: string;
}): string | undefined => {
  const fields = getIocEsqlFields(type);
  if (!fields || fields.length === 0) {
    return undefined;
  }

  return `FROM ${quoteEsqlIdentifier(indexPattern)} | WHERE ${buildFieldEqualityWhere(fields, value)}`;
};
