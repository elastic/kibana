/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { METADATA_INDEX_PREFIX } from './constants';
import { buildMetadataFilterClause } from './metadata_filter';
import type { MetadataFilter } from './metadata_filter';

export interface BuildEntityQueryOptions {
  type: string;
  identityFields: string[];
  indexPattern: string; // already validated — must be string-interpolated, NO param form exists
  start: string;
  end: string;
  mode: 'discovery' | 'backfill';
  lookbackStart?: string; // required when mode === 'backfill'
  definitionId: string; // used to derive the metadata index name
  metadataFilters?: MetadataFilter[]; // applied as a post-JOIN WHERE in discovery mode only
}

export interface BuiltQuery {
  query: string;
  params: Array<Record<string, string | number>>;
}

/**
 * Builds an ES|QL discovery or backfill query for a runtime entity definition.
 *
 * Identity fields are passed as identifier params (??f0, ??f1, …) — verified safe.
 * The index pattern and metadata index name are string-interpolated because no
 * identifier param form exists for FROM sources (ES rejects ??idx with a 400).
 * The index pattern MUST be validated with validateIndexPattern() before calling this.
 *
 * SET unmapped_fields="nullify" is prepended so cross-index queries over divergent
 * mappings don't fail with "Unknown column".
 */
export const buildEntityQuery = (opts: BuildEntityQueryOptions): BuiltQuery => {
  const {
    type,
    identityFields,
    indexPattern,
    start,
    end,
    mode,
    lookbackStart,
    definitionId,
    metadataFilters,
  } = opts;
  const metadataIndex = `${METADATA_INDEX_PREFIX}-${definitionId}`;

  // Build field null-checks: each identity field must be present
  const fieldNotNullClauses = identityFields.map((_, i) => `??f${i} IS NOT NULL`).join(' AND ');

  // Build BY clause: group by all identity fields
  const byClause = identityFields.map((_, i) => `??f${i}`).join(', ');

  // Build CONCAT args for entity.id: type ":" f0 ":" f1 …
  const concatArgs = [
    '?etype',
    ...identityFields.flatMap((_, i) => ['":", TO_STRING(??f' + i + ')']),
  ].join(', ');

  // Value params (safe: passed out-of-band, never interpolated into the query string)
  const params: Array<Record<string, string | number>> = [
    { start: mode === 'backfill' ? lookbackStart ?? start : start },
    { end },
    { etype: type },
    // Identifier params for each identity field
    ...identityFields.map((field, i) => ({ [`f${i}`]: field })),
  ];

  const timeFilter = `@timestamp >= ?start AND @timestamp <= ?end`;

  if (mode === 'discovery') {
    // Discovery: JOIN against the metadata index to pick up first_seen, then optionally
    // filter on joined metadata columns before KEEP (which would otherwise drop them).
    const { clause: metaClause, params: metaParams } = buildMetadataFilterClause(
      metadataFilters ?? []
    );
    const queryLines = [
      'SET unmapped_fields="nullify";',
      `FROM ${indexPattern}`,
      `| WHERE ${timeFilter} AND ${fieldNotNullClauses}`,
      `| STATS last_seen = MAX(@timestamp), discovery_min = MIN(@timestamp), doc_count = COUNT(*) BY ${byClause}`,
      `| EVAL entity.id = CONCAT(${concatArgs})`,
      `| LOOKUP JOIN ${metadataIndex} ON entity.id`,
    ];
    // WHERE must come before KEEP — KEEP drops metadata columns, so a filter after it
    // would hit "Unknown column".
    if (metaClause) {
      queryLines.push(`| WHERE ${metaClause}`);
    }
    queryLines.push(
      `| KEEP entity.id, ${identityFields
        .map((_, i) => `??f${i}`)
        .join(', ')}, first_seen, last_seen, doc_count`,
      `| SORT entity.id`,
      `| LIMIT 500`
    );
    const query = queryLines.join('\n');
    return { query, params: [...params, ...metaParams] };
  } else {
    // Backfill: compute MIN(@timestamp) per entity.id to get first_seen
    const query = [
      'SET unmapped_fields="nullify";',
      `FROM ${indexPattern}`,
      `| WHERE ${timeFilter} AND ${fieldNotNullClauses}`,
      `| STATS first_seen_min = MIN(@timestamp) BY ${byClause}`,
      `| EVAL entity.id = CONCAT(${concatArgs})`,
      `| KEEP entity.id, first_seen_min`,
      `| SORT entity.id`,
      `| LIMIT 500`,
    ].join('\n');
    return { query, params };
  }
};

/** Name of the lookup index for a given definition id. */
export const metadataIndexName = (definitionId: string): string =>
  `${METADATA_INDEX_PREFIX}-${definitionId}`;
