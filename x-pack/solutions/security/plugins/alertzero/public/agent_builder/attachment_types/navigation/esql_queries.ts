/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';

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
 * ES|QL `FROM` accepts a comma-separated source list, but a flat `_id IN (...)`
 * filter across all sources loses the id-to-index pairing (a matching id can land
 * in the wrong source index and surface an unrelated document). Group refs by
 * index and OR each group's own `_id IN (...)` clause, scoped to its index via
 * `_index ==`, so only the exact (index, id) pairs match.
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
  const validRefs = refs
    .map((ref) => ({ id: ref.id.trim(), index: ref.index.trim() }))
    .filter((ref) => ref.id && ref.index);

  if (validRefs.length === 0) {
    return undefined;
  }

  const byIndex = groupBy(validRefs, (ref) => ref.index);
  const indices = Object.keys(byIndex);
  const perIndexClauses = indices.map((index) => {
    const quotedIds = quoteEsqlList(uniqueNonEmpty(byIndex[index].map((ref) => ref.id)));
    const idFieldClause = idField ? `${idField} IN (${quotedIds}) OR ` : '';
    return `(_index == ${quoteEsqlIdentifier(index)} AND (${idFieldClause}_id IN (${quotedIds})))`;
  });

  return `FROM ${indices
    .map(quoteEsqlIdentifier)
    .join(', ')} METADATA _id, _index | WHERE ${perIndexClauses.join(' OR ')}`;
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

/**
 * Discover exit for all of an SSE's `alerts[]` refs at once.
 *
 * Every ref is pinned to the current space's alerts alias rather than its persisted
 * `index`, for the reason documented on `buildAlertDetailsUrl`: the schema accepts any
 * non-empty index string and these payloads are workflow-authored, so a ref must not be
 * able to point a conversation link at another space's alias or a wildcard.
 */
export const buildAlertsLookupEsql = ({
  alerts,
  spaceId,
}: {
  alerts: Array<{ alert_id: string; index: string }>;
  spaceId: string;
}): string | undefined =>
  buildDocRefsLookupEsql({
    refs: alerts.map((alert) => ({ id: alert.alert_id, index: getAlertsIndex(spaceId) })),
    idField: 'kibana.alert.uuid',
  });

/** Sentinel space id for global/shared threat-intel rows (mirrors GLOBAL_SPACE_ID in security_solution). */
export const GLOBAL_THREAT_INTEL_SPACE_ID = '*' as const;

/**
 * Threat reports are logically space-scoped (`space_id` keyword field), same as
 * the threat-intel route's own space filtering. Discover exits query the shared
 * hidden index directly, bypassing the route, so they must apply the same
 * `space_id IN (currentSpace, '*')` filter themselves or a user could read
 * another space's report by following this link.
 */
const buildThreatReportSpaceWhere = (spaceId: string): string =>
  `space_id IN (${quoteEsqlList([spaceId, GLOBAL_THREAT_INTEL_SPACE_ID])})`;

export const buildThreatReportLookupEsql = ({
  reportId,
  spaceId,
}: {
  reportId: string;
  spaceId: string;
}): string =>
  // Single-id IN (...) is equivalent to an _id == comparison for Discover's purposes.
  buildThreatReportsInEsql({ reportIds: [reportId], spaceId })!;

export const buildThreatReportsInEsql = ({
  reportIds,
  spaceId,
}: {
  reportIds: string[];
  spaceId: string;
}): string | undefined => {
  const uniqueReportIds = [...new Set(reportIds)];
  if (uniqueReportIds.length === 0) {
    return undefined;
  }

  const quotedIds = uniqueReportIds.map((reportId) => `"${escapeEsqlString(reportId)}"`).join(', ');
  return `FROM ${quoteEsqlIdentifier(
    THREAT_REPORTS_INDEX_PATTERN
  )} METADATA _id | WHERE _id IN (${quotedIds}) AND ${buildThreatReportSpaceWhere(spaceId)}`;
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
 * ES|QL lookup for a hunt correlation anchor field on threat reports (actor names,
 * ioc_set_hash). Both anchor kinds query the same index with a single field/value
 * equality plus the space filter; only the field differs.
 */
export const buildThreatReportFieldLookupEsql = ({
  field,
  value,
  spaceId,
}: {
  field: string;
  value: string;
  spaceId: string;
}): string | undefined => {
  if (!value.trim()) {
    return undefined;
  }

  return `FROM ${quoteEsqlIdentifier(
    THREAT_REPORTS_INDEX_PATTERN
  )} | WHERE ${buildFieldEqualityWhere([field], value)} AND ${buildThreatReportSpaceWhere(
    spaceId
  )}`;
};

/**
 * Hunt correlation actor anchors live on threat reports, not ECS logs fields.
 */
export const buildActorLookupEsql = ({
  value,
  spaceId,
}: {
  value: string;
  spaceId: string;
}): string | undefined =>
  buildThreatReportFieldLookupEsql({ field: 'extracted.threat_actors', value, spaceId });

/**
 * ES|QL lookup for hunt correlation `ioc_set_hash` anchors on threat reports.
 * (Hash anchors use a nested Discover filter instead; see
 * `buildDiscoverThreatReportNestedIocUrl`.)
 */
export const buildThreatReportIocSetHashLookupEsql = ({
  value,
  spaceId,
}: {
  value: string;
  spaceId: string;
}): string | undefined =>
  buildThreatReportFieldLookupEsql({ field: 'extracted.ioc_set_hash', value, spaceId });
