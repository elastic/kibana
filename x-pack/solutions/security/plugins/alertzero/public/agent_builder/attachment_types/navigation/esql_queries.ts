/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const THREAT_REPORTS_INDEX_PATTERN = '.kibana-threat-reports*' as const;

/** Escape a value for use inside a double-quoted ES|QL string literal. */
const escapeEsqlString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const quoteEsqlIdentifier = (identifier: string): string => `"${escapeEsqlString(identifier)}"`;

const quoteEsqlList = (values: string[]): string =>
  values.map((value) => `"${escapeEsqlString(value)}"`).join(', ');

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
  `FROM ${quoteEsqlIdentifier(
    THREAT_REPORTS_INDEX_PATTERN
  )} METADATA _id | WHERE _id IN (${quoteEsqlList([reportId])}) AND ${buildThreatReportSpaceWhere(
    spaceId
  )}`;
