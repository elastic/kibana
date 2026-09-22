/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_ALERTS_INDEX = '.alerts-security.alerts' as const;
export const THREAT_REPORTS_INDEX_PATTERN = '.kibana-threat-reports*' as const;
/** Best-effort default for IOC Discover lookups when no index pattern is provided. */
export const DEFAULT_LOGS_INDEX_PATTERN = 'logs-*' as const;

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
  // Match on `_id` only: `event.id` isn't populated by every integration (e.g. AWS CloudTrail),
  // and querying it there fails with "Unknown column [event.id]" instead of just missing a hit.
  return `FROM ${quoteEsqlIdentifier(index)} METADATA _id | WHERE _id == "${escapedEventId}"`;
};

const uniqueNonEmpty = (values: string[]): string[] => [
  ...new Set(values.map((value) => value.trim()).filter(Boolean)),
];

const quoteEsqlList = (values: string[]): string =>
  values.map((value) => `"${escapeEsqlString(value)}"`).join(', ');

/**
 * One Discover exit for a whole set of document refs, each carrying its own index.
 * ES|QL `FROM` accepts a comma-separated source list, so refs spread across several
 * indices still open as a single query.
 */
const buildDocRefsLookupEsql = ({
  refs,
  idField,
}: {
  refs: Array<{ id: string; index: string }>;
  /**
   * Optional ECS/field alias to OR against `_id`. Omit when the field isn't
   * guaranteed present across every source index (e.g. `event.id` is absent
   * from some integrations, such as AWS CloudTrail, and querying an absent
   * field fails the whole ES|QL request instead of just missing a hit).
   */
  idField?: string;
}): string | undefined => {
  const ids = uniqueNonEmpty(refs.map((ref) => ref.id));
  const indices = uniqueNonEmpty(refs.map((ref) => ref.index));
  if (ids.length === 0 || indices.length === 0) {
    return undefined;
  }

  const quotedIds = quoteEsqlList(ids);
  const idFieldClause = idField ? `${idField} IN (${quotedIds}) OR ` : '';
  return `FROM ${indices
    .map(quoteEsqlIdentifier)
    .join(', ')} METADATA _id | WHERE ${idFieldClause}_id IN (${quotedIds})`;
};

/** Discover exit for all of an SSE's `events[]` refs at once. */
export const buildEventsLookupEsql = ({
  events,
}: {
  events: Array<{ event_id: string; source_index: string }>;
}): string | undefined =>
  buildDocRefsLookupEsql({
    refs: events.map((event) => ({ id: event.event_id, index: event.source_index })),
  });

/** Discover exit for all of an SSE's `alerts[]` refs at once. */
export const buildAlertsLookupEsql = ({
  alerts,
}: {
  alerts: Array<{ alert_id: string; index: string }>;
}): string | undefined =>
  buildDocRefsLookupEsql({
    refs: alerts.map((alert) => ({ id: alert.alert_id, index: alert.index })),
    idField: 'kibana.alert.uuid',
  });

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

/**
 * Build an ES|QL lookup for an exact ECS field + value from an SSE entity ref.
 * `field` must already be allowlisted by the attachment entity schema.
 */
export const buildEntityLookupEsql = ({
  field,
  value,
  indexPattern = DEFAULT_LOGS_INDEX_PATTERN,
}: {
  field: string;
  value: string;
  indexPattern?: string;
}): string | undefined => {
  if (!field.trim() || !value.trim()) {
    return undefined;
  }

  return `FROM ${quoteEsqlIdentifier(indexPattern)} | WHERE ${buildFieldEqualityWhere(
    [field],
    value
  )}`;
};

/**
 * Hunt correlation actor anchors live on threat reports, not ECS logs fields.
 */
export const buildActorLookupEsql = ({ value }: { value: string }): string | undefined => {
  if (!value.trim()) {
    return undefined;
  }

  return `FROM ${quoteEsqlIdentifier(
    THREAT_REPORTS_INDEX_PATTERN
  )} | WHERE ${buildFieldEqualityWhere(['extracted.threat_actors'], value)}`;
};

/**
 * ES|QL lookup for hunt correlation `ioc_set_hash` anchors on threat reports.
 * (Hash anchors use a nested Discover filter instead; see
 * `buildDiscoverThreatReportNestedIocUrl`.)
 */
export const buildThreatReportIocSetHashLookupEsql = ({
  value,
}: {
  value: string;
}): string | undefined => {
  if (!value.trim()) {
    return undefined;
  }

  return `FROM ${quoteEsqlIdentifier(
    THREAT_REPORTS_INDEX_PATTERN
  )} | WHERE ${buildFieldEqualityWhere(['extracted.ioc_set_hash'], value)}`;
};
