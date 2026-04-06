/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortOrder } from '../../../../../../common/api/detection_engine';
import { FindRulesSortField } from '../../../../../../common/api/detection_engine/rule_management';

export interface ParsedGranularSort {
  sortField: FindRulesSortField;
  sortOrder: SortOrder;
}

const flattenSortTokens = (sort: string[] | undefined): string[] => {
  if (sort == null || sort.length === 0) {
    return [];
  }
  const out: string[] = [];
  for (const raw of sort) {
    for (const piece of raw.split(',')) {
      const t = piece.trim();
      if (t) {
        out.push(t);
      }
    }
  }
  return out;
};

/**
 * Uses the first valid `field:order` token; additional tokens are ignored (MVP until multi-sort is supported end-to-end).
 */
export const parseGranularSort = (sort: string[] | undefined): ParsedGranularSort | undefined => {
  const tokens = flattenSortTokens(sort);
  if (tokens.length === 0) {
    return undefined;
  }

  const first = tokens[0];
  const lastColon = first.lastIndexOf(':');
  if (lastColon <= 0 || lastColon === first.length - 1) {
    return undefined;
  }

  const field = first.slice(0, lastColon);
  const order = first.slice(lastColon + 1).trim();
  if (order !== 'asc' && order !== 'desc') {
    return undefined;
  }

  const parsedField = FindRulesSortField.safeParse(field);
  if (!parsedField.success) {
    return undefined;
  }

  return { sortField: parsedField.data, sortOrder: order };
};
