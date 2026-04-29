/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExcludedDocument, EsqlState } from '../types';
import type { RuleRangeTuple } from '../../types';

export const initiateExcludedDocuments = ({
  state,
  isRuleAggregating,
  tuple,
  hasMvExpand,
  query,
}: {
  state: EsqlState | undefined;
  isRuleAggregating: boolean;
  tuple: RuleRangeTuple;
  hasMvExpand: boolean;
  query?: string;
}): Record<string, ExcludedDocument[]> => {
  // exclude ids from store if mv_expand used and query has changed. this would allow to create alerts from changed mv_expand queries
  if (
    isRuleAggregating ||
    !state?.excludedDocuments ||
    (hasMvExpand && query !== state.lastQuery)
  ) {
    return {};
  }

  const excludedDocuments: Record<string, ExcludedDocument[]> = {};

  for (const index of Object.keys(
    // handle a case when excludedDocuments format was array in previous implementation
    // we would discard this array and build a new structure aware of document indices
    Array.isArray(state.excludedDocuments) ? {} : state.excludedDocuments
  )) {
    const indexDocuments =
      state?.excludedDocuments?.[index]?.filter(({ timestamp }) => {
        return timestamp && timestamp >= tuple.from.toISOString();
      }) ?? [];

    if (indexDocuments.length) {
      excludedDocuments[index] = indexDocuments;
    }
  }

  return excludedDocuments;
};
