/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A user-authored metadata field returned from the lookup index's _field_caps. */
export interface MetadataField {
  name: string;
  type: string;
}

export const METADATA_FILTER_OPERATORS = [
  'is',
  'isNot',
  'contains',
  'exists',
  'doesNotExist',
] as const;

export type MetadataFilterOperator = (typeof METADATA_FILTER_OPERATORS)[number];

export interface MetadataFilter {
  field: string;
  operator: MetadataFilterOperator;
  /** Absent for exists / doesNotExist operators. */
  value?: string;
}

interface BuiltMetadataClause {
  clause: string;
  params: Array<Record<string, string>>;
}

/**
 * Builds an ES|QL WHERE clause fragment for a list of metadata filters, plus the params
 * needed to pass field names and values out-of-band (zero string interpolation for user input).
 *
 * Param naming: `mf<i>` for field identifier params, `mv<i>` for value params. These cannot
 * collide with the discovery query's params (`f<i>`, `start`, `end`, `etype`).
 *
 * Returns an empty clause when filters is empty — callers need no special case.
 */
export const buildMetadataFilterClause = (filters: MetadataFilter[]): BuiltMetadataClause => {
  const parts: string[] = [];
  const params: Array<Record<string, string>> = [];

  filters.forEach((filter, i) => {
    const fieldParam = `mf${i}`;
    const valueParam = `mv${i}`;

    params.push({ [fieldParam]: filter.field });

    switch (filter.operator) {
      case 'is':
        params.push({ [valueParam]: filter.value ?? '' });
        parts.push(`??${fieldParam} == ?${valueParam}`);
        break;
      case 'isNot':
        params.push({ [valueParam]: filter.value ?? '' });
        parts.push(`??${fieldParam} != ?${valueParam}`);
        break;
      case 'contains':
        // Lowercase both sides for case-insensitive matching.
        // Verified live: TO_LOWER(owner) LIKE "*cau*" hits, "*CAU*" does not.
        params.push({ [valueParam]: `*${(filter.value ?? '').toLowerCase()}*` });
        parts.push(`TO_LOWER(??${fieldParam}) LIKE ?${valueParam}`);
        break;
      case 'exists':
        parts.push(`??${fieldParam} IS NOT NULL`);
        break;
      case 'doesNotExist':
        parts.push(`??${fieldParam} IS NULL`);
        break;
    }
  });

  return { clause: parts.join(' AND '), params };
};
