/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import { HUNT_CASE_INSENSITIVE_IOC_TYPES } from '@kbn/alertzero-common';
import { normalizeIpAddress } from '../../../../common/sse_view';

export const DEFAULT_ALERTS_INDEX = '.alerts-security.alerts' as const;
export const THREAT_REPORTS_INDEX_PATTERN = '.kibana-threat-reports*' as const;
/** Best-effort default for entity Discover lookups when no index pattern is provided. */
export const DEFAULT_LOGS_INDEX_PATTERN = 'logs-*' as const;

/** Escape a value for use inside a double-quoted ES|QL string literal. */
const escapeEsqlString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/** The current space's alerts alias, which every alert exit ramp is pinned to. */
export const getAlertsIndex = (spaceId: string): string => `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

const quoteEsqlIdentifier = (identifier: string): string => `"${escapeEsqlString(identifier)}"`;

const quoteEsqlList = (values: string[]): string =>
  values.map((value) => `"${escapeEsqlString(value)}"`).join(', ');

const uniqueNonEmpty = (values: string[]): string[] => [
  ...new Set(values.map((value) => value.trim()).filter(Boolean)),
];

/** Sentinel space id for global/shared threat-intel rows (mirrors GLOBAL_SPACE_ID in security_solution). */
export const GLOBAL_THREAT_INTEL_SPACE_ID = '*' as const;

/** Discover exit for one `events[]` ref, which carries its own source index. */
export const buildEventLookupEsql = ({
  index,
  eventId,
}: {
  index: string;
  eventId: string;
}): string =>
  // `_id` is only available after METADATA _id (otherwise Discover reports Unknown column [_id]).
  // Match on `_id` only: `event.id` isn't populated by every integration (e.g. AWS CloudTrail),
  // and querying it there fails with "Unknown column [event.id]" instead of just missing a hit.
  `FROM ${quoteEsqlIdentifier(index)} METADATA _id | WHERE _id == "${escapeEsqlString(eventId)}"`;

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

  return `FROM ${quoteEsqlIdentifier(indexPattern)} | WHERE ${field} == "${escapeEsqlString(
    value
  )}"`;
};

/**
 * `address/prefix` with a well-formed address. Tier 1's term query on an `ip` field
 * accepts CIDR notation, so a range can be a confirmed match, but no single-value
 * predicate here can reproduce it: `::ip` rejects the range and `CIDR_MATCH` is null on
 * a multivalued cell.
 */
const isCidrRange = (value: string): boolean => {
  const slash = value.lastIndexOf('/');
  if (slash === -1) return false;
  const prefix = value.slice(slash + 1);
  return /^\d{1,3}$/.test(prefix) && normalizeIpAddress(value.slice(0, slash)) !== undefined;
};

/**
 * Discover exit for an IOC detection: the caller-supplied indices (Tier 1 `per_index`,
 * else the cited events' sources), filtered to the ECS field and value that matched.
 *
 * The predicate is `MV_CONTAINS`, not `==`: Tier 1 matches with term queries, which hit
 * any element of a multivalued field (`host.ip`, `related.ip`, `kubernetes.audit.sourceIPs`),
 * while ES|QL scalar `==` is null on a multivalued cell and would open Discover empty for
 * a confirmed match. `MV_CONTAINS` is typed and the field's mapping is unknown here, so
 * the field is always coerced to the literal's type: a well-formed IP value (an `ip` IOC,
 * or an untyped one that parses as an address) compares as `ip`, which canonicalizes IPv6
 * spellings and accepts keyword fields that hold addresses; hash and domain IOCs compare
 * case-folded, matching Tier 1's case-insensitive clauses; everything else compares as a
 * string via `TO_STRING`. The ip literal is the canonical spelling, not the stored value:
 * `"bad"::ip`, `"[::1]"::ip` and `"010.0.0.1"::ip` are all null, and `MV_CONTAINS(field, null)`
 * matches every row, so an `ip` IOC whose value does not parse takes the string branch
 * instead. Absent when field/value/indices are empty, and for a CIDR `ip` IOC: a range
 * cannot be pivoted on with a single-value predicate, and no link beats one that opens
 * empty for a confirmed match.
 */
export const buildIocMatchEsql = ({
  indices,
  field,
  value,
  iocType,
}: {
  indices: readonly string[];
  field: string;
  value: string;
  /** IOC type of `value`; decides how the field is coerced before comparing. */
  iocType?: string;
}): string | undefined => {
  const cleanedIndices = uniqueNonEmpty([...indices]);
  if (cleanedIndices.length === 0 || !field.trim() || !value.trim()) {
    return undefined;
  }

  const mayBeIp = iocType === 'ip' || iocType === undefined;
  if (mayBeIp && isCidrRange(value.trim())) {
    return undefined;
  }

  const ipLiteral = mayBeIp ? normalizeIpAddress(value) : undefined;
  const predicate = ipLiteral
    ? `MV_CONTAINS(TO_IP(${field}), "${ipLiteral}"::ip)`
    : iocType && HUNT_CASE_INSENSITIVE_IOC_TYPES.has(iocType)
    ? `MV_CONTAINS(TO_LOWER(${field}), "${escapeEsqlString(value.toLowerCase())}")`
    : `MV_CONTAINS(TO_STRING(${field}), "${escapeEsqlString(value)}")`;
  return `FROM ${cleanedIndices.map(quoteEsqlIdentifier).join(', ')} | WHERE ${predicate}`;
};
