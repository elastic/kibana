/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

/**
 * Converts a Kibana Filter to a KQL query string.
 * Most filters have KQL in meta.query, but for filters that don't,
 * we convert common filter types manually.
 *
 * Note: There's no general utility in the codebase to convert Filter objects to KQL,
 * so we handle the most common cases here. Filters with meta.query are preferred.
 *
 * @param filter - The Kibana Filter to convert
 * @returns KQL query string or null if the filter cannot be converted
 */
export const filterToKql = (filter: Filter): string | null => {
  // Most filters already have KQL in meta.query - use it directly
  if (filter.meta?.query) {
    return filter.meta.query;
  }

  // For filters without meta.query, convert common types manually
  // Handle match_phrase filters (most common case)
  if (filter.query?.match_phrase) {
    const field = Object.keys(filter.query.match_phrase)[0];
    const matchPhraseValue = filter.query.match_phrase[field];
    let value: string | undefined;

    if (typeof matchPhraseValue === 'string') {
      value = matchPhraseValue;
    } else if (
      matchPhraseValue &&
      typeof matchPhraseValue === 'object' &&
      'query' in matchPhraseValue
    ) {
      value = matchPhraseValue.query;
    }

    if (value !== undefined && typeof value === 'string') {
      const negate = filter.meta?.negate ? 'NOT ' : '';
      return `${negate}${field}: "${value}"`;
    }
  }

  // Handle range filters
  if (filter.query?.range) {
    const field = Object.keys(filter.query.range)[0];
    const range = filter.query.range[field];
    const parts: string[] = [];

    if (range.gte !== undefined) {
      parts.push(`${field} >= ${range.gte}`);
    } else if (range.gt !== undefined) {
      parts.push(`${field} > ${range.gt}`);
    }

    if (range.lte !== undefined) {
      const prefix = parts.length > 0 ? ' AND ' : '';
      parts.push(`${prefix}${field} <= ${range.lte}`);
    } else if (range.lt !== undefined) {
      const prefix = parts.length > 0 ? ' AND ' : '';
      parts.push(`${prefix}${field} < ${range.lt}`);
    }

    if (parts.length > 0) {
      const negate = filter.meta?.negate ? 'NOT ' : '';
      return `${negate}${parts.join(' AND ')}`;
    }
  }

  // Handle exists filters
  if (filter.query?.exists) {
    const field = filter.query.exists.field;
    const negate = filter.meta?.negate ? 'NOT ' : '';
    return `${negate}${field}: *`;
  }

  // Handle terms filters (multi-value)
  if (filter.query?.terms) {
    const field = Object.keys(filter.query.terms)[0];
    const values = filter.query.terms[field];
    if (Array.isArray(values) && values.length > 0) {
      const valueList = values.map((v) => `"${v}"`).join(' OR ');
      const negate = filter.meta?.negate ? 'NOT ' : '';
      return `${negate}${field}: (${valueList})`;
    }
  }

  // For other filter types without meta.query, return null to skip
  // These filters will be handled by buildQueryFromFilters for validation
  return null;
};
