/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

const SLO_GROUPINGS_PREFIX = 'slo.groupings.';

const SUMMARY_NATIVE_PREFIXES = ['slo.', 'service.', 'transaction.', 'monitor.', 'observer.'];

function isSummaryNativeField(field: string): boolean {
  return SUMMARY_NATIVE_PREFIXES.some((prefix) => field.startsWith(prefix));
}

function replaceFieldInQuery(obj: unknown, oldField: string, newField: string): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => replaceFieldInQuery(item, oldField, newField));

  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === 'field' && value === oldField) {
      result[key] = newField;
    } else {
      const newKey = key === oldField ? newField : key;
      result[newKey] = replaceFieldInQuery(value, oldField, newField);
    }
  }
  return result;
}

export function rewriteFilterForSloSummary(filter: Filter): Filter {
  const field = filter.meta?.key;
  if (!field || isSummaryNativeField(field)) {
    return filter;
  }

  const newField = `${SLO_GROUPINGS_PREFIX}${field}`;
  return {
    ...filter,
    meta: { ...filter.meta, key: newField },
    ...(filter.query && {
      query: replaceFieldInQuery(filter.query, field, newField) as Record<string, unknown>,
    }),
  };
}

export function rewriteFiltersForSloSummary(filters: Filter[]): Filter[] {
  return filters.map(rewriteFilterForSloSummary);
}
