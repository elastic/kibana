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
  // `_id` is only available after METADATA _id (otherwise Discover reports Unknown column [_id]).
  return `FROM ${quoteEsqlIdentifier(
    index
  )} METADATA _id | WHERE event.id == "${escapedEventId}" OR _id == "${escapedEventId}"`;
};

export const buildAlertLookupEsql = ({
  spaceId,
  alertId,
}: {
  spaceId: string;
  alertId: string;
}): string => {
  const escapedAlertId = escapeEsqlString(alertId);
  return `FROM ${quoteEsqlIdentifier(
    getAlertsIndex(spaceId)
  )} METADATA _id | WHERE kibana.alert.uuid == "${escapedAlertId}" OR _id == "${escapedAlertId}"`;
};

export const buildThreatReportLookupEsql = ({ reportId }: { reportId: string }): string => {
  const escapedReportId = escapeEsqlString(reportId);
  return `FROM ${quoteEsqlIdentifier(
    THREAT_REPORTS_INDEX_PATTERN
  )} METADATA _id | WHERE _id == "${escapedReportId}"`;
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
  return `FROM ${quoteEsqlIdentifier(
    THREAT_REPORTS_INDEX_PATTERN
  )} METADATA _id | WHERE _id IN (${quotedIds})`;
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

  return `FROM ${quoteEsqlIdentifier(indexPattern)} | WHERE ${buildFieldEqualityWhere(
    fields,
    value
  )}`;
};

/** ECS fields used for Discover lookups from attachment entity chips. */
const ENTITY_KIND_TO_ESQL_FIELDS: Readonly<Record<string, readonly string[]>> = {
  user: ['user.name', 'user.target.name'],
  host: ['host.name', 'host.hostname'],
  service: ['service.name'],
  // IAM roles commonly surface on user.name in CloudTrail-normalized logs.
  role: ['user.name', 'user.target.name'],
  actor: ['threat.group.name'],
};

/**
 * Build an ES|QL lookup for an attachment entity short name by kind.
 * Returns undefined for unknown/generic kinds (prefer skip over guessing).
 */
export const buildEntityLookupEsql = ({
  kind,
  value,
  indexPattern = DEFAULT_LOGS_INDEX_PATTERN,
}: {
  kind: string;
  value: string;
  indexPattern?: string;
}): string | undefined => {
  const fields = ENTITY_KIND_TO_ESQL_FIELDS[kind];
  if (!fields || fields.length === 0 || !value.trim()) {
    return undefined;
  }

  return `FROM ${quoteEsqlIdentifier(indexPattern)} | WHERE ${buildFieldEqualityWhere(
    fields,
    value
  )}`;
};
